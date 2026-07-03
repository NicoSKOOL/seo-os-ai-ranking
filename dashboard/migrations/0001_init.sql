-- SEO OS hosted dashboard schema (Cloudflare D1).
--
-- This is the sanitized display projection + command queue that the hosted
-- dashboard reads and writes. The VPS Hermes worker keeps its own local SQLite
-- as the source of truth and pushes sanitized state up to these tables.
--
-- Ported from server.py:25-148 (the 9 original tables), with three changes:
--   1. every operational table gains account_id (multi-tenant scoping enforced
--      in SQL on the server, not in the browser);
--   2. new tenancy tables (accounts, account_members);
--   3. new plumbing tables (commands queue, job_runs history).
-- Conventions follow live-qa/src/db/schema.sql: IF NOT EXISTS, datetime('now')
-- defaults, explicit indexes.

-- ── Tenancy ────────────────────────────────────────────────────────────────
-- One account = one operator's whole workspace. Self-install has exactly one
-- account; an owner-hosted deployment has many. Same code either way.
CREATE TABLE IF NOT EXISTS accounts (
  id               TEXT PRIMARY KEY,
  name             TEXT NOT NULL,
  plan             TEXT NOT NULL DEFAULT 'self_install',   -- 'self_install' | 'hosted'
  agent_token_hash TEXT,                                   -- sha256 of this account's VPS sync token
  last_agent_sync  TEXT,                                   -- heartbeat: last successful /agent/* call
  status           TEXT NOT NULL DEFAULT 'active',
  created_at       TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at       TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Verified Cloudflare Access email -> account. Unique email keeps it operator-scoped.
CREATE TABLE IF NOT EXISTS account_members (
  account_id TEXT NOT NULL REFERENCES accounts(id),
  email      TEXT NOT NULL,
  role       TEXT NOT NULL DEFAULT 'operator',   -- future: 'viewer', 'admin'
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  password_hash TEXT,   -- pbkdf2$<iterations>$<saltHex>$<hashHex>
  PRIMARY KEY (account_id, email)
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_members_email ON account_members(email);

-- ── The 9 ported tables (now account-scoped) ───────────────────────────────
CREATE TABLE IF NOT EXISTS clients (
  id             TEXT PRIMARY KEY,
  account_id     TEXT NOT NULL REFERENCES accounts(id),
  name           TEXT NOT NULL,
  domain         TEXT NOT NULL,
  role           TEXT NOT NULL,
  status         TEXT NOT NULL DEFAULT 'setup',
  health_score   INTEGER NOT NULL DEFAULT 0,
  hermes_profile TEXT NOT NULL DEFAULT '',
  telegram_topic TEXT NOT NULL DEFAULT 'not_bound',   -- display-only flag; raw chat/thread IDs never sync here
  gsc_status     TEXT NOT NULL DEFAULT 'not_connected',
  ga4_status     TEXT NOT NULL DEFAULT 'not_connected',
  repo_status    TEXT NOT NULL DEFAULT 'not_connected',
  zernio_status  TEXT NOT NULL DEFAULT 'not_connected',
  workspace      TEXT NOT NULL DEFAULT '',             -- relative handle only; absolute VPS paths never sync here
  archived_at    TEXT,                                 -- archive-first (replaces destructive delete)
  created_at     TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at     TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_clients_account ON clients(account_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_clients_domain ON clients(account_id, domain);

CREATE TABLE IF NOT EXISTS metrics_snapshots (
  id                TEXT PRIMARY KEY,
  account_id        TEXT NOT NULL REFERENCES accounts(id),
  client_id         TEXT NOT NULL,
  period_label      TEXT NOT NULL,
  clicks            INTEGER NOT NULL DEFAULT 0,
  clicks_delta      INTEGER NOT NULL DEFAULT 0,
  impressions       INTEGER NOT NULL DEFAULT 0,
  impressions_delta INTEGER NOT NULL DEFAULT 0,
  ctr               REAL NOT NULL DEFAULT 0,
  ctr_delta         REAL NOT NULL DEFAULT 0,
  avg_rank          REAL NOT NULL DEFAULT 0,
  avg_rank_delta    REAL NOT NULL DEFAULT 0,
  conversions       INTEGER NOT NULL DEFAULT 0,
  created_at        TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_metrics_scope ON metrics_snapshots(account_id, client_id);

CREATE TABLE IF NOT EXISTS opportunities (
  id                   TEXT PRIMARY KEY,
  account_id           TEXT NOT NULL REFERENCES accounts(id),
  client_id            TEXT NOT NULL,
  page                 TEXT NOT NULL,
  problem              TEXT NOT NULL,
  opportunity_type     TEXT NOT NULL,
  priority             TEXT NOT NULL,
  impact               TEXT NOT NULL,
  confidence           TEXT NOT NULL,
  effort               TEXT NOT NULL,
  impressions          INTEGER NOT NULL DEFAULT 0,
  clicks               INTEGER NOT NULL DEFAULT 0,
  ctr                  REAL NOT NULL DEFAULT 0,
  position             REAL NOT NULL DEFAULT 0,
  recommended_workflow TEXT NOT NULL,
  status               TEXT NOT NULL,
  evidence_json        TEXT NOT NULL DEFAULT '{}',
  created_at           TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at           TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_opps_scope ON opportunities(account_id, client_id, priority);

CREATE TABLE IF NOT EXISTS approval_requests (
  id               TEXT PRIMARY KEY,
  account_id       TEXT NOT NULL REFERENCES accounts(id),
  client_id        TEXT NOT NULL,                 -- may be 'all' for policy rows
  title            TEXT NOT NULL,
  type             TEXT NOT NULL,
  risk             TEXT NOT NULL,
  status           TEXT NOT NULL,
  requested_action TEXT NOT NULL,
  evidence         TEXT NOT NULL,
  source_url       TEXT NOT NULL,
  agent_confidence TEXT NOT NULL,
  production_gate  TEXT NOT NULL,
  decision_note    TEXT NOT NULL DEFAULT '',
  decided_by       TEXT,                          -- operator email (audit)
  decided_at       TEXT,
  created_at       TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at       TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_appr_scope ON approval_requests(account_id, client_id, status);

CREATE TABLE IF NOT EXISTS agent_tasks (
  id            TEXT PRIMARY KEY,
  account_id    TEXT NOT NULL REFERENCES accounts(id),
  client_id     TEXT NOT NULL,
  title         TEXT NOT NULL,
  priority      TEXT NOT NULL,
  status        TEXT NOT NULL,
  source        TEXT NOT NULL,
  owner_profile TEXT NOT NULL,
  page_asset    TEXT NOT NULL,
  next_action   TEXT NOT NULL,
  notes         TEXT NOT NULL DEFAULT '',
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at    TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_tasks_scope ON agent_tasks(account_id, client_id, status);

CREATE TABLE IF NOT EXISTS managed_jobs (
  id            TEXT PRIMARY KEY,
  account_id    TEXT NOT NULL REFERENCES accounts(id),
  client_id     TEXT NOT NULL,
  name          TEXT NOT NULL,
  job_type      TEXT NOT NULL,
  cadence       TEXT NOT NULL,
  next_run      TEXT NOT NULL,
  last_run      TEXT NOT NULL,
  status        TEXT NOT NULL,
  model_policy  TEXT NOT NULL,
  data_sources  TEXT NOT NULL,
  latest_result TEXT NOT NULL,
  managed_by    TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_jobs_scope ON managed_jobs(account_id, client_id);

CREATE TABLE IF NOT EXISTS activity_events (
  id          TEXT PRIMARY KEY,
  account_id  TEXT NOT NULL REFERENCES accounts(id),
  client_id   TEXT NOT NULL,                 -- 'all' allowed for global events
  source      TEXT NOT NULL,
  event_type  TEXT NOT NULL,
  status      TEXT NOT NULL,
  summary     TEXT NOT NULL,
  next_action TEXT NOT NULL,
  artifact    TEXT NOT NULL DEFAULT '',
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_events_scope ON activity_events(account_id, client_id, created_at);

CREATE TABLE IF NOT EXISTS artifacts (
  id            TEXT PRIMARY KEY,
  account_id    TEXT NOT NULL REFERENCES accounts(id),
  client_id     TEXT NOT NULL,
  title         TEXT NOT NULL,
  artifact_type TEXT NOT NULL,
  status        TEXT NOT NULL,
  summary       TEXT NOT NULL,
  storage       TEXT NOT NULL DEFAULT 'vps',   -- 'r2' | 'vps' | 'gdoc' | 'external'
  storage_key   TEXT NOT NULL DEFAULT '',      -- R2 object key, VPS path handle, or URL
  content_type  TEXT NOT NULL DEFAULT '',
  bytes         INTEGER NOT NULL DEFAULT 0,
  visibility    TEXT NOT NULL DEFAULT 'private', -- 'private' (VPS) | 'shareable' (R2)
  path_or_url   TEXT NOT NULL DEFAULT '',       -- back-compat with server.py:240-241
  updated_at    TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_artifacts_scope ON artifacts(account_id, client_id);

CREATE TABLE IF NOT EXISTS settings (
  account_id TEXT NOT NULL REFERENCES accounts(id),
  key        TEXT NOT NULL,
  value      TEXT NOT NULL,
  PRIMARY KEY (account_id, key)
);

-- ── Command queue: operator decisions that flow DOWN to the VPS ─────────────
CREATE TABLE IF NOT EXISTS commands (
  id              TEXT PRIMARY KEY,
  account_id      TEXT NOT NULL REFERENCES accounts(id),
  client_id       TEXT,                         -- null = account-wide
  type            TEXT NOT NULL,                -- execute_approved_task | run_job | refresh_client | onboard_client | archive_client
  payload_json    TEXT NOT NULL DEFAULT '{}',
  status          TEXT NOT NULL DEFAULT 'pending',  -- pending | claimed | done | failed
  idempotency_key TEXT,                         -- dedupes double-clicks + retries
  requested_by    TEXT,                         -- operator email
  claimed_at      TEXT,
  completed_at    TEXT,
  result_json     TEXT,
  error           TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_cmd_poll ON commands(account_id, status, created_at);
CREATE UNIQUE INDEX IF NOT EXISTS idx_cmd_idem ON commands(account_id, idempotency_key);

-- ── Real (non-simulated) job execution history ─────────────────────────────
CREATE TABLE IF NOT EXISTS job_runs (
  id          TEXT PRIMARY KEY,
  account_id  TEXT NOT NULL REFERENCES accounts(id),
  client_id   TEXT,
  job_id      TEXT,
  command_id  TEXT,
  trigger     TEXT NOT NULL,                    -- schedule | manual | command
  status      TEXT NOT NULL DEFAULT 'running',  -- running | ok | failed
  summary     TEXT NOT NULL DEFAULT '',
  log_excerpt TEXT NOT NULL DEFAULT '',         -- short status only; full logs stay on the VPS
  started_at  TEXT NOT NULL DEFAULT (datetime('now')),
  finished_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_jobruns ON job_runs(account_id, job_id, started_at);

-- Chat with Hermes (Phase C). One conversation thread per scope (a client, or the
-- orchestrator for "All Clients"). Operator turns are written by the Worker as
-- 'pending' and ride a chat_reply command down to the VPS; Hermes's reply comes
-- back through /agent/commands/:id/complete and is stored as an 'assistant' row.
-- Dashboard-only table: never synced up from the VPS.
CREATE TABLE IF NOT EXISTS chat_messages (
  id          TEXT PRIMARY KEY,
  account_id  TEXT NOT NULL REFERENCES accounts(id),
  client_id   TEXT,                              -- null = orchestrator / All Clients scope
  session_key TEXT NOT NULL,                     -- 'dashboard-chat-<client_id>' | 'dashboard-chat-orchestrator'
  role        TEXT NOT NULL,                     -- 'operator' | 'assistant'
  body        TEXT NOT NULL,
  status      TEXT NOT NULL DEFAULT 'complete',  -- operator: 'pending'|'answered'|'failed'; assistant: 'complete'
  command_id  TEXT,                              -- the commands row that carried this turn
  error       TEXT,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_chat_scope ON chat_messages(account_id, client_id, created_at);
