/**
 * SEO OS - Hosted Dashboard Worker
 *
 * Serves the operator command center (static design via the ASSETS binding) and
 * a JSON API backed by D1. D1 holds the sanitized display projection that the
 * VPS Hermes worker pushes up; the operator reads it from anywhere, behind
 * Cloudflare Access.
 *
 * Milestone 1 surface: GET /api/summary (server-scoped by account + client) and
 * GET /api/health. Decision/refresh write endpoints and the /agent/* sync API
 * arrive in later milestones.
 *
 * Auth model: the deployed hostname sits behind a Cloudflare Access application.
 * Access injects Cf-Access-Authenticated-User-Email; we resolve that to an
 * account_id and scope every query to it in SQL. The browser can never widen
 * its own scope. In local dev (no Access header) we assume a single account.
 */

import { VERSION } from "./version";

interface Env {
  DB: D1Database;
  ASSETS: Fetcher;
  REPORTS?: R2Bucket;
  KV?: KVNamespace;
  AGENT_TOKEN?: string;
  COOKIE_SECRET?: string;
}

const json = (data: unknown, init: ResponseInit = {}) =>
  new Response(JSON.stringify(data), {
    ...init,
    headers: { "content-type": "application/json", "cache-control": "no-store", ...(init.headers || {}) },
  });

const bad = (status: number, message: string) => json({ error: message }, { status });

// Minutes after which the dashboard considers the VPS sync stale (data is old).
const STALE_AFTER_MINUTES = 15;

// SQL expression for "now" in the SAME ISO-8601 form the VPS bridge writes
// (server.py now() -> "2026-06-29T01:00:00+00:00"). Used for rows in tables that
// the VPS also ingests (activity_events, approval_requests) so worker-written and
// VPS-pushed rows sort consistently under a lexicographic ORDER BY. The commands
// table stays on datetime('now') (space form) because its claimed_at is compared
// against datetime('now','-15 minutes') in the claim query.
const NOW_ISO = "strftime('%Y-%m-%dT%H:%M:%S','now')||'+00:00'";

interface AccountRow {
  id: string;
  name: string;
  last_agent_sync: string | null;
}

// ── Built-in login (email + password, signed-cookie session) ────────────────
// Works on the free workers.dev address: no custom domain or Cloudflare Access
// needed. The session cookie carries "<account_id>|<email>", HMAC-signed with
// COOKIE_SECRET. Passwords are PBKDF2-SHA256 hashes stored on account_members.

const SESSION_COOKIE = "seo_os_sess";
const PBKDF2_ITERATIONS = 100000;

function hexToBytes(hex: string): Uint8Array {
  const a = new Uint8Array(hex.length / 2);
  for (let i = 0; i < a.length; i++) a[i] = parseInt(hex.substr(i * 2, 2), 16);
  return a;
}
function bytesToHex(b: Uint8Array): string {
  return [...b].map((x) => x.toString(16).padStart(2, "0")).join("");
}

// Cookie-signing secret. Members deployed via the button set no secret at all:
// the Worker generates one on first use and persists it in KV. An explicit
// COOKIE_SECRET (Nico's setup) always wins. Deleting the KV value logs every
// session out, which is an acceptable reset lever.
let cachedSecret: string | null = null;
async function getSecret(env: Env): Promise<string> {
  if (env.COOKIE_SECRET) return env.COOKIE_SECRET;
  if (cachedSecret) return cachedSecret;
  if (env.KV) {
    let s = await env.KV.get("cookie_secret");
    if (!s) {
      const b = new Uint8Array(32);
      crypto.getRandomValues(b);
      s = bytesToHex(b);
      await env.KV.put("cookie_secret", s);
    }
    cachedSecret = s;
    return s;
  }
  return "dev-secret-change-me";
}

async function hmac(value: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(value));
  return btoa(String.fromCharCode(...new Uint8Array(sig))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
async function signValue(value: string, secret: string): Promise<string> {
  return `${value}.${await hmac(value, secret)}`;
}
async function unsignValue(signed: string | null, secret: string): Promise<string | null> {
  if (!signed) return null;
  const i = signed.lastIndexOf(".");
  if (i < 0) return null;
  const value = signed.slice(0, i);
  return (await hmac(value, secret)) === signed.slice(i + 1) ? value : null;
}
function parseCookies(req: Request): Record<string, string> {
  const out: Record<string, string> = {};
  const h = req.headers.get("cookie");
  if (!h) return out;
  for (const part of h.split(";")) {
    const i = part.indexOf("=");
    if (i < 0) continue;
    out[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim());
  }
  return out;
}
function cookieHeader(name: string, value: string, maxAgeSeconds: number): string {
  return `${name}=${encodeURIComponent(value)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAgeSeconds}`;
}

async function pbkdf2Hex(password: string, salt: Uint8Array, iterations: number): Promise<string> {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", salt, iterations, hash: "SHA-256" }, key, 256);
  return bytesToHex(new Uint8Array(bits));
}
// stored format: pbkdf2$<iterations>$<saltHex>$<hashHex>
async function verifyPassword(password: string, stored: string | null): Promise<boolean> {
  if (!stored) return false;
  const parts = stored.split("$");
  if (parts.length !== 4 || parts[0] !== "pbkdf2") return false;
  const dk = await pbkdf2Hex(password, hexToBytes(parts[2]), parseInt(parts[1], 10));
  if (dk.length !== parts[3].length) return false;
  let diff = 0;
  for (let i = 0; i < dk.length; i++) diff |= dk.charCodeAt(i) ^ parts[3].charCodeAt(i);
  return diff === 0;
}

// Resolve the signed-in operator's account from the session cookie.
async function resolveAccount(req: Request, env: Env): Promise<AccountRow | null> {
  const v = await unsignValue(parseCookies(req)[SESSION_COOKIE] || null, await getSecret(env));
  if (!v) return null;
  const accountId = v.split("|")[0];
  if (!accountId) return null;
  return env.DB.prepare(
    `SELECT id, name, last_agent_sync FROM accounts WHERE id = ?1 AND status = 'active' LIMIT 1`,
  )
    .bind(accountId)
    .first<AccountRow>();
}

// Build a "scoped to account (and optionally one client)" query. When a specific
// client is selected, rows tagged client_id = 'all' (policy / global rows) are
// excluded, matching the original summary() behavior and the client-isolation rule.
function scopedAll(env: Env, sql: string, accountId: string, clientId: string, tail = "") {
  if (clientId === "all") {
    return env.DB.prepare(`${sql} WHERE account_id = ?1 ${tail}`).bind(accountId);
  }
  return env.DB.prepare(`${sql} WHERE account_id = ?1 AND client_id = ?2 ${tail}`).bind(accountId, clientId);
}

async function listScoped(env: Env, sql: string, accountId: string, clientId: string, tail = "") {
  const { results } = await scopedAll(env, sql, accountId, clientId, tail).all();
  return results as any[];
}

/**
 * The dashboard payload. Faithful port of summary() (server.py:254-291), scoped
 * server-side to one account. `clients` is always the full account roster (for
 * the top switcher); the other arrays respect the selected client.
 */
async function summary(env: Env, account: AccountRow, clientId: string) {
  const accountId = account.id;

  // Full account roster for the switcher (never archived).
  const { results: clients } = await env.DB.prepare(
    `SELECT * FROM clients
      WHERE account_id = ?1 AND archived_at IS NULL
      ORDER BY CASE status WHEN 'active' THEN 0 ELSE 1 END, name`,
  )
    .bind(accountId)
    .all();

  const metrics = await listScoped(env, "SELECT * FROM metrics_snapshots", accountId, clientId);
  const approvals = await listScoped(
    env,
    "SELECT * FROM approval_requests",
    accountId,
    clientId,
    "ORDER BY CASE status WHEN 'needs_review' THEN 0 WHEN 'approved' THEN 1 ELSE 2 END, updated_at DESC",
  );
  const opportunities = await listScoped(
    env,
    "SELECT * FROM opportunities",
    accountId,
    clientId,
    "ORDER BY CASE priority WHEN 'high' THEN 0 WHEN 'medium' THEN 1 ELSE 2 END, impressions DESC",
  );
  const tasks = await listScoped(
    env,
    "SELECT * FROM agent_tasks",
    accountId,
    clientId,
    "ORDER BY CASE priority WHEN 'high' THEN 0 WHEN 'medium' THEN 1 ELSE 2 END, updated_at DESC",
  );
  const jobs = await listScoped(
    env,
    "SELECT * FROM managed_jobs",
    accountId,
    clientId,
    "ORDER BY CASE status WHEN 'setup_needed' THEN 0 WHEN 'failed' THEN 1 ELSE 2 END, next_run",
  );
  const events = await listScoped(
    env,
    "SELECT * FROM activity_events",
    accountId,
    clientId,
    "ORDER BY created_at DESC LIMIT 30",
  );
  const artifacts = await listScoped(
    env,
    "SELECT * FROM artifacts",
    accountId,
    clientId,
    "ORDER BY updated_at DESC",
  );

  const { results: settingRows } = await env.DB.prepare(
    `SELECT key, value FROM settings WHERE account_id = ?1`,
  )
    .bind(accountId)
    .all();
  const settings: Record<string, string> = {};
  for (const r of settingRows as any[]) settings[r.key] = r.value;

  const visibleClients =
    clientId === "all" ? clients : (clients as any[]).filter((c) => c.id === clientId);

  const lastSync = account.last_agent_sync;
  const stale =
    !lastSync ||
    Date.now() - new Date(lastSync.replace(" ", "T") + "Z").getTime() > STALE_AFTER_MINUTES * 60 * 1000;

  return {
    generated_at: new Date().toISOString(),
    active_client: clientId,
    account: { id: account.id, name: account.name },
    clients,
    visible_clients: visibleClients,
    metrics,
    approvals,
    opportunities,
    tasks,
    jobs,
    events,
    artifacts,
    settings,
    sync: { last_agent_sync: lastSync, stale },
    kpis: {
      pending_approvals: approvals.filter((a) => a.status === "needs_review").length,
      open_tasks: tasks.filter((t) => t.status !== "done" && t.status !== "cancelled").length,
      high_impact_opportunities: opportunities.filter((o) => o.priority === "high").length,
      active_jobs: jobs.filter((j) => ["ok", "running", "setup_needed"].includes(j.status)).length,
      sites_monitored: visibleClients.length,
      system_health: jobs.some((j) => j.status === "failed") ? "Issue" : "OK",
    },
  };
}

async function handleApi(req: Request, env: Env, url: URL): Promise<Response> {
  const path = url.pathname;
  const method = req.method;

  // GET /api/health -> liveness (no auth needed).
  if (path === "/api/health" && method === "GET") {
    try {
      const r = await env.DB.prepare(`SELECT COUNT(*) AS n FROM accounts`).first<{ n: number }>();
      return json({ ok: true, accounts: r?.n ?? 0, version: VERSION });
    } catch (e: any) {
      return json({ ok: false, error: String(e?.message || e), version: VERSION }, { status: 500 });
    }
  }

  // POST /api/login { email, password } -> set the session cookie.
  if (path === "/api/login" && method === "POST") {
    const body = await readJson<{ email?: string; password?: string }>(req);
    const email = (body?.email || "").trim().toLowerCase();
    const password = body?.password || "";
    if (!email || !password) return bad(400, "Email and password are required.");
    const member = await env.DB.prepare(
      `SELECT m.account_id, m.password_hash, a.name
         FROM account_members m JOIN accounts a ON a.id = m.account_id
        WHERE lower(m.email) = ?1 AND a.status = 'active' LIMIT 1`,
    )
      .bind(email)
      .first<{ account_id: string; password_hash: string | null; name: string }>();
    const ok = member ? await verifyPassword(password, member.password_hash) : false;
    if (!member || !ok) return bad(401, "Wrong email or password.");
    const cookie = await signValue(`${member.account_id}|${email}`, await getSecret(env));
    return json(
      { ok: true, account: { id: member.account_id, name: member.name } },
      { headers: { "set-cookie": cookieHeader(SESSION_COOKIE, cookie, 60 * 60 * 24 * 30) } },
    );
  }

  // POST /api/logout -> clear the session cookie.
  if (path === "/api/logout" && method === "POST") {
    return json({ ok: true }, { headers: { "set-cookie": cookieHeader(SESSION_COOKIE, "", 0) } });
  }

  // GET /api/me -> the signed-in account, or null.
  if (path === "/api/me" && method === "GET") {
    const account = await resolveAccount(req, env);
    return json({ account: account ? { id: account.id, name: account.name } : null });
  }

  // GET /api/summary?client=<id|all> -> the whole dashboard payload, scoped.
  if (path === "/api/summary" && method === "GET") {
    const account = await resolveAccount(req, env);
    if (!account) return bad(401, "Not signed in.");
    let clientId = (url.searchParams.get("client") || "all").trim() || "all";
    // Validate the selected client belongs to this account; otherwise fall back
    // to 'all' so a tampered query can never reach another account's client.
    if (clientId !== "all") {
      const owns = await env.DB.prepare(
        `SELECT 1 FROM clients WHERE id = ?1 AND account_id = ?2 LIMIT 1`,
      )
        .bind(clientId, account.id)
        .first();
      if (!owns) clientId = "all";
    }
    return json(await summary(env, account, clientId));
  }

  // POST /api/approvals/:id/decision -> record the operator's decision and enqueue
  // exactly one bounded command for the VPS bridge. The decision flows DOWN via the
  // commands queue; this endpoint never publishes or deploys anything.
  if (path.startsWith("/api/approvals/") && path.endsWith("/decision") && method === "POST") {
    const account = await resolveAccount(req, env);
    if (!account) return bad(401, "Not signed in.");
    const approvalId = path.slice("/api/approvals/".length, -"/decision".length);
    if (!approvalId) return bad(404, "Approval not found.");

    const body = await readJson<{ decision?: string; note?: string }>(req);
    const decision = (body?.decision || "").trim();
    const note = (body?.note || "").trim().slice(0, 1000);
    if (decision !== "approved" && decision !== "needs_changes" && decision !== "rejected") {
      return bad(400, "Invalid decision.");
    }

    const appr = await env.DB.prepare(
      `SELECT id, client_id, title, type, requested_action, source_url
         FROM approval_requests WHERE id = ?1 AND account_id = ?2 LIMIT 1`,
    )
      .bind(approvalId, account.id)
      .first<{ id: string; client_id: string | null; title: string; type: string; requested_action: string | null; source_url: string | null }>();
    if (!appr) return bad(404, "Approval not found.");
    if (appr.type === "policy") return bad(400, "Policy rows are not decidable.");

    // Operator email lives in the signed session cookie ("<account_id>|<email>").
    const cookieVal = await unsignValue(parseCookies(req)[SESSION_COOKIE] || null, await getSecret(env));
    const email = cookieVal ? cookieVal.split("|")[1] || "" : "";

    const cmdType = decision === "approved" ? "execute_approved_task" : "record_decision";
    const payloadJson = JSON.stringify({
      approval_id: appr.id,
      decision,
      note,
      client_id: appr.client_id,
      title: appr.title,
      source_url: appr.source_url,
      requested_action: appr.requested_action,
    });
    // Deterministic so a double-click (same approval + same decision) collapses to a
    // single audit row via ON CONFLICT DO NOTHING. A later different decision on the
    // same approval gets its own row.
    const eventId = `ev_appr_${appr.id}_${decision}`;
    const eventStatus = decision === "approved" ? "complete" : "waiting";
    const eventSummary = `Approval ${decision.replace(/_/g, " ")}: ${appr.title}`;
    const eventNextAction =
      decision === "approved"
        ? "Bridge will create the bounded agent task on the VPS."
        : "Agent will wait for the next human instruction.";
    const eventArtifact = appr.source_url || "";
    const idempotencyKey = `appr:${appr.id}:${decision}`;
    const commandId = `cmd_${crypto.randomUUID()}`;

    await env.DB.batch([
      env.DB.prepare(
        `UPDATE approval_requests
            SET status = ?1, decision_note = ?2, decided_by = ?3, decided_at = ${NOW_ISO}, updated_at = ${NOW_ISO}
          WHERE id = ?4 AND account_id = ?5`,
      ).bind(decision, note, email, approvalId, account.id),
      env.DB.prepare(
        `INSERT INTO activity_events (id,account_id,client_id,source,event_type,status,summary,next_action,artifact,created_at)
         VALUES (?1,?2,?3,'dashboard','approval_decision',?4,?5,?6,?7,${NOW_ISO})
         ON CONFLICT(id) DO NOTHING`,
      ).bind(eventId, account.id, appr.client_id, eventStatus, eventSummary, eventNextAction, eventArtifact),
      // Enqueue the bounded command. ON CONFLICT keeps a double-click to one command,
      // but re-drives a command that previously FAILED (e.g. a transient VPS DB lock)
      // back to 'pending' so re-approving can recover it. A still-pending/claimed/done
      // command is left untouched (the WHERE makes the upsert a no-op for those).
      env.DB.prepare(
        `INSERT INTO commands (id,account_id,client_id,type,payload_json,status,idempotency_key,requested_by,created_at,updated_at)
         VALUES (?1,?2,?3,?4,?5,'pending',?6,?7,datetime('now'),datetime('now'))
         ON CONFLICT(account_id, idempotency_key) DO UPDATE SET
           status='pending', claimed_at=NULL, completed_at=NULL, error=NULL, result_json=NULL,
           payload_json=excluded.payload_json, requested_by=excluded.requested_by,
           client_id=excluded.client_id, type=excluded.type, updated_at=datetime('now')
         WHERE commands.status='failed'`,
      ).bind(commandId, account.id, appr.client_id, cmdType, payloadJson, idempotencyKey, email),
    ]);

    return json({ ok: true });
  }

  // POST /api/chat/messages -> queue an operator message for Hermes. Body {client_id, body}.
  // 'all'/empty client => the orchestrator scope (client_id stored NULL). The reply rides a
  // chat_reply command down to the VPS and comes back via /agent/commands/:id/complete.
  if (path === "/api/chat/messages" && method === "POST") {
    const account = await resolveAccount(req, env);
    if (!account) return bad(401, "Not signed in.");
    const body = await readJson<{ client_id?: string; body?: string; section?: string }>(req);
    const text = (body?.body || "").trim().slice(0, 4000);
    if (!text) return bad(400, "Message body is required.");
    const section = (body?.section || "").trim().slice(0, 80);
    let clientId: string | null = (body?.client_id || "").trim() || null;
    if (clientId === "all") clientId = null;
    if (clientId) {
      const owns = await env.DB.prepare(`SELECT 1 FROM clients WHERE id=?1 AND account_id=?2 LIMIT 1`)
        .bind(clientId, account.id).first();
      if (!owns) clientId = null; // unknown client => orchestrator, never another account's client
    }
    const sessionKey = clientId ? `dashboard-chat-${clientId}` : "dashboard-chat-orchestrator";
    const cookieVal = await unsignValue(parseCookies(req)[SESSION_COOKIE] || null, await getSecret(env));
    const email = cookieVal ? cookieVal.split("|")[1] || "" : "";
    const msgId = `chat_${crypto.randomUUID()}`;
    const cmdId = `cmd_${crypto.randomUUID()}`;
    const payloadJson = JSON.stringify({ chat_message_id: msgId, client_id: clientId, session_key: sessionKey, section, body: text });
    await env.DB.batch([
      env.DB.prepare(
        `INSERT INTO chat_messages (id,account_id,client_id,session_key,role,body,status,command_id,created_at)
         VALUES (?1,?2,?3,?4,'operator',?5,'pending',?6,${NOW_ISO})`,
      ).bind(msgId, account.id, clientId, sessionKey, text, cmdId),
      env.DB.prepare(
        `INSERT INTO commands (id,account_id,client_id,type,payload_json,status,idempotency_key,requested_by,created_at,updated_at)
         VALUES (?1,?2,?3,'chat_reply',?4,'pending',?5,?6,datetime('now'),datetime('now'))
         ON CONFLICT(account_id, idempotency_key) DO NOTHING`,
      ).bind(cmdId, account.id, clientId, payloadJson, `chat-${msgId}`, email),
    ]);
    return json({ id: msgId, status: "pending", created_at: new Date().toISOString() });
  }

  // GET /api/chat?client=<id|all>&since=<iso?> -> the conversation for a scope, ascending,
  // plus a `pending` flag (any operator turn still awaiting Hermes) for the "thinking" UI.
  if (path === "/api/chat" && method === "GET") {
    const account = await resolveAccount(req, env);
    if (!account) return bad(401, "Not signed in.");
    let clientId: string | null = (url.searchParams.get("client") || "all").trim() || "all";
    if (clientId === "all") clientId = null;
    if (clientId) {
      const owns = await env.DB.prepare(`SELECT 1 FROM clients WHERE id=?1 AND account_id=?2 LIMIT 1`)
        .bind(clientId, account.id).first();
      if (!owns) clientId = null;
    }
    const scopeSql = clientId ? "client_id = ?2" : "client_id IS NULL";
    const scopeBinds: any[] = clientId ? [account.id, clientId] : [account.id];
    const since = (url.searchParams.get("since") || "").trim();
    let sql = `SELECT id, client_id, session_key, role, body, status, command_id, error, created_at
                 FROM chat_messages WHERE account_id = ?1 AND ${scopeSql}`;
    const binds = [...scopeBinds];
    if (since) { sql += ` AND created_at > ?${binds.length + 1}`; binds.push(since); }
    sql += ` ORDER BY created_at ASC LIMIT 200`;
    const { results } = await env.DB.prepare(sql).bind(...binds).all();
    // pending computed over the WHOLE scope (not the since-window) so the thinking
    // indicator is correct even when polling with a recent `since`.
    const pend = await env.DB.prepare(
      `SELECT 1 FROM chat_messages WHERE account_id=?1 AND ${scopeSql} AND role='operator' AND status='pending' LIMIT 1`,
    ).bind(...scopeBinds).first();
    return json({ ok: true, messages: results, pending: !!pend });
  }

  return bad(404, "Not found.");
}

// ── Agent sync API (/agent/*) ───────────────────────────────────────────────
// Used only by the VPS Hermes worker, authenticated by a per-account bearer
// token. The token's sha256 is stored on accounts.agent_token_hash; we hash the
// presented token and match it to resolve the account. NOT behind Cloudflare
// Access (the worker is non-interactive). The payload's account_id is never
// trusted: every write is forced to the account the token resolves to.

async function readJson<T>(req: Request): Promise<T | null> {
  try {
    return (await req.json()) as T;
  } catch {
    return null;
  }
}

async function sha256hex(s: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function resolveAgentAccount(req: Request, env: Env): Promise<string | null> {
  const m = (req.headers.get("Authorization") || "").match(/^Bearer\s+(.+)$/i);
  if (!m) return null;
  const hash = await sha256hex(m[1].trim());
  const row = await env.DB.prepare(
    `SELECT id FROM accounts WHERE agent_token_hash = ?1 AND status = 'active' LIMIT 1`,
  )
    .bind(hash)
    .first<{ id: string }>();
  return row?.id ?? null;
}

// Columns the VPS may write per table. account_id is always forced from the
// token, never read from the payload. Anything not listed is ignored.
const SYNC_TABLES: Record<string, { conflict: string[]; cols: string[]; guardedSet?: Record<string, string> }> = {
  clients: { conflict: ["id"], cols: ["id", "name", "domain", "role", "status", "health_score", "hermes_profile", "telegram_topic", "gsc_status", "ga4_status", "repo_status", "zernio_status", "workspace", "archived_at", "created_at", "updated_at"] },
  metrics_snapshots: { conflict: ["id"], cols: ["id", "client_id", "period_label", "clicks", "clicks_delta", "impressions", "impressions_delta", "ctr", "ctr_delta", "avg_rank", "avg_rank_delta", "conversions", "created_at"] },
  opportunities: { conflict: ["id"], cols: ["id", "client_id", "page", "problem", "opportunity_type", "priority", "impact", "confidence", "effort", "impressions", "clicks", "ctr", "position", "recommended_workflow", "status", "evidence_json", "created_at", "updated_at"] },
  approval_requests: {
    conflict: ["id"],
    cols: ["id", "client_id", "title", "type", "risk", "status", "requested_action", "evidence", "source_url", "agent_confidence", "production_gate", "decision_note", "created_at", "updated_at"],
    // Protect an operator's dashboard decision from being reverted by a later VPS
    // push: once decided_at is set, keep the dashboard's status/decision_note when
    // the incoming row still reads 'needs_review'.
    guardedSet: {
      status: "status = CASE WHEN excluded.status='needs_review' AND approval_requests.decided_at IS NOT NULL THEN approval_requests.status ELSE excluded.status END",
      decision_note: "decision_note = CASE WHEN approval_requests.decided_at IS NOT NULL THEN approval_requests.decision_note ELSE excluded.decision_note END",
    },
  },
  agent_tasks: { conflict: ["id"], cols: ["id", "client_id", "title", "priority", "status", "source", "owner_profile", "page_asset", "next_action", "notes", "created_at", "updated_at"] },
  managed_jobs: { conflict: ["id"], cols: ["id", "client_id", "name", "job_type", "cadence", "next_run", "last_run", "status", "model_policy", "data_sources", "latest_result", "managed_by"] },
  activity_events: { conflict: ["id"], cols: ["id", "client_id", "source", "event_type", "status", "summary", "next_action", "artifact", "created_at"] },
  artifacts: { conflict: ["id"], cols: ["id", "client_id", "title", "artifact_type", "status", "summary", "storage", "storage_key", "content_type", "bytes", "visibility", "path_or_url", "updated_at"] },
  settings: { conflict: ["account_id", "key"], cols: ["key", "value"] },
};

function buildUpserts(env: Env, account: string, table: string, rows: any[]): D1PreparedStatement[] {
  const def = SYNC_TABLES[table];
  if (!def || !Array.isArray(rows)) return [];
  const stmts: D1PreparedStatement[] = [];
  for (const row of rows) {
    if (!row || typeof row !== "object") continue;
    const present = def.cols.filter((c) => c in row && c !== "account_id");
    const insertCols = ["account_id", ...present];
    const values = [account, ...present.map((c) => (row as any)[c])];
    const placeholders = insertCols.map((_, i) => `?${i + 1}`).join(",");
    const updatable = insertCols.filter((c) => !def.conflict.includes(c) && c !== "account_id");
    const setClause = updatable.length
      ? updatable.map((c) => def.guardedSet?.[c] ?? `${c}=excluded.${c}`).join(",")
      : "account_id=account_id";
    const sql = `INSERT INTO ${table} (${insertCols.join(",")}) VALUES (${placeholders}) ON CONFLICT(${def.conflict.join(",")}) DO UPDATE SET ${setClause}`;
    stmts.push(env.DB.prepare(sql).bind(...values));
  }
  return stmts;
}

async function handleAgent(req: Request, env: Env, url: URL): Promise<Response> {
  const account = await resolveAgentAccount(req, env);
  if (!account) return bad(401, "Bad or missing agent token.");
  const path = url.pathname;
  const method = req.method;

  // POST /agent/heartbeat -> liveness ping (updates last_agent_sync).
  if (path === "/agent/heartbeat" && method === "POST") {
    await env.DB.prepare(`UPDATE accounts SET last_agent_sync = datetime('now') WHERE id = ?1`).bind(account).run();
    return json({ ok: true, account_id: account });
  }

  // POST /agent/ingest -> bulk sanitized upsert of state into D1.
  if (path === "/agent/ingest" && method === "POST") {
    const body = await readJson<Record<string, any>>(req);
    if (!body) return bad(400, "Invalid JSON.");
    const applied: Record<string, number> = {};
    let stmts: D1PreparedStatement[] = [];
    for (const table of Object.keys(SYNC_TABLES)) {
      const rows = body[table];
      if (Array.isArray(rows) && rows.length) {
        const s = buildUpserts(env, account, table, rows);
        applied[table] = s.length;
        stmts = stmts.concat(s);
      }
    }
    stmts.push(env.DB.prepare(`UPDATE accounts SET last_agent_sync = datetime('now') WHERE id = ?1`).bind(account));
    // Chunk to stay well under D1's per-batch statement limit.
    for (let i = 0; i < stmts.length; i += 50) {
      await env.DB.batch(stmts.slice(i, i + 50));
    }
    return json({ ok: true, account_id: account, applied });
  }

  // GET /agent/commands?max=N -> atomically claim pending (and stale-claimed)
  // commands for this token's account. UPDATE ... RETURNING flips them to 'claimed'
  // in one statement; commands claimed >15 min ago are reclaimed so a crashed
  // bridge self-heals.
  if (path === "/agent/commands" && method === "GET") {
    const max = Math.min(Math.max(parseInt(url.searchParams.get("max") || "10", 10) || 10, 1), 50);
    const { results } = await env.DB.prepare(
      `UPDATE commands
          SET status='claimed', claimed_at=datetime('now'), updated_at=datetime('now')
        WHERE id IN (
          SELECT id FROM commands
           WHERE account_id=?1
             AND ( status='pending'
                   OR (status='claimed' AND claimed_at < datetime('now','-15 minutes')) )
           ORDER BY created_at
           LIMIT ?2 )
        RETURNING id, type, client_id, payload_json, idempotency_key, created_at`,
    )
      .bind(account, max)
      .all();
    return json({ ok: true, commands: results });
  }

  // POST /agent/commands/:id/complete -> mark a claimed command done|failed. Scoped
  // to the token's account so a token can never complete another account's command.
  // For chat_reply commands it also lands the assistant message + mirrors proposals.
  if (path.startsWith("/agent/commands/") && path.endsWith("/complete") && method === "POST") {
    const commandId = path.slice("/agent/commands/".length, -"/complete".length);
    if (!commandId) return bad(404, "Command not found.");
    const cmd = await env.DB.prepare(
      `SELECT id, type, payload_json FROM commands WHERE id=?1 AND account_id=?2 LIMIT 1`,
    ).bind(commandId, account).first<{ id: string; type: string; payload_json: string }>();
    if (!cmd) return bad(404, "Command not found.");
    const body = await readJson<{ status?: string; result?: any; error?: string }>(req);
    const status = body?.status === "failed" ? "failed" : "done";
    const resultJson = body?.result != null ? JSON.stringify(body.result).slice(0, 8000) : null;
    const error = body?.error ? String(body.error).slice(0, 2000) : null;

    const stmts: D1PreparedStatement[] = [
      env.DB.prepare(
        `UPDATE commands SET status=?1, result_json=?2, error=?3, completed_at=datetime('now'),
                updated_at=datetime('now') WHERE id=?4 AND account_id=?5`,
      ).bind(status, resultJson, error, commandId, account),
    ];

    if (cmd.type === "chat_reply") {
      let payload: any = {};
      try { payload = JSON.parse(cmd.payload_json || "{}"); } catch {}
      const opMsgId: string | undefined = payload.chat_message_id;
      const clientId: string | null = payload.client_id ?? null;
      const sessionKey: string = payload.session_key || "dashboard-chat-orchestrator";
      if (status === "done") {
        const result = (body?.result || {}) as { reply_body?: string; proposals?: any[] };
        const replyBody = String(result.reply_body || "").slice(0, 8000) || "(Hermes returned an empty reply.)";
        stmts.push(env.DB.prepare(
          `INSERT INTO chat_messages (id,account_id,client_id,session_key,role,body,status,command_id,created_at)
           VALUES (?1,?2,?3,?4,'assistant',?5,'complete',?6,${NOW_ISO})`,
        ).bind(`chat_${crypto.randomUUID()}`, account, clientId, sessionKey, replyBody, commandId));
        if (opMsgId) {
          stmts.push(env.DB.prepare(`UPDATE chat_messages SET status='answered' WHERE id=?1 AND account_id=?2`)
            .bind(opMsgId, account));
        }
        // Mirror chat proposals as needs_review approval cards (reusing the bridge id so
        // the next state push is a no-op). Chat can only PROPOSE; the operator approves.
        const proposals = Array.isArray(result.proposals) ? result.proposals.slice(0, 10) : [];
        for (const p of proposals) {
          if (!p || typeof p !== "object" || !p.id) continue;
          stmts.push(env.DB.prepare(
            `INSERT INTO approval_requests
               (id,account_id,client_id,title,type,risk,status,requested_action,evidence,source_url,agent_confidence,production_gate,decision_note,created_at,updated_at)
             VALUES (?1,?2,?3,?4,?5,?6,'needs_review',?7,?8,?9,?10,?11,'',${NOW_ISO},${NOW_ISO})
             ON CONFLICT(id) DO NOTHING`,
          ).bind(
            String(p.id), account, String(p.client_id || clientId || "all"),
            String(p.title || "Hermes proposal").slice(0, 300),
            String(p.type || "plan").slice(0, 60),
            String(p.risk || "medium").slice(0, 20),
            String(p.requested_action || "").slice(0, 2000),
            String(p.evidence || "").slice(0, 2000),
            String(p.source_url || "").slice(0, 500),
            String(p.agent_confidence || "medium").slice(0, 60),
            String(p.production_gate || "Production remains separately gated.").slice(0, 500),
          ));
        }
      } else {
        if (opMsgId) {
          stmts.push(env.DB.prepare(`UPDATE chat_messages SET status='failed', error=?1 WHERE id=?2 AND account_id=?3`)
            .bind((error || "Hermes did not respond.").slice(0, 500), opMsgId, account));
        }
        stmts.push(env.DB.prepare(
          `INSERT INTO chat_messages (id,account_id,client_id,session_key,role,body,status,command_id,created_at)
           VALUES (?1,?2,?3,?4,'assistant',?5,'complete',?6,${NOW_ISO})`,
        ).bind(`chat_${crypto.randomUUID()}`, account, clientId, sessionKey, "Hermes did not respond to that one. Please try again.", commandId));
      }
    }

    await env.DB.batch(stmts);
    return json({ ok: true });
  }

  return bad(404, "Not found.");
}

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const url = new URL(req.url);
    if (url.pathname.startsWith("/api/")) {
      return handleApi(req, env, url);
    }
    if (url.pathname.startsWith("/agent/")) {
      return handleAgent(req, env, url);
    }
    return env.ASSETS.fetch(req);
  },
};
