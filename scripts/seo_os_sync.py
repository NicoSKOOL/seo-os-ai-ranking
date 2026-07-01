#!/usr/bin/env python3
"""SEO OS sync: push your VPS dashboard state up to the hosted Cloudflare dashboard.

This is the "bridge". It reads your local SEO OS SQLite database (the one Hermes
already writes), sanitizes it, and POSTs the rows to the hosted dashboard's
intake door (/agent/ingest), authenticated by your account's secret token. Your
VPS stays the source of truth; this only sends a copy up.

Pure Python standard library (sqlite3 + urllib). No pip installs. Python 3.8+.

Config (read from the environment, or from a key=value file if present):
  SEO_OS_URL    hosted dashboard base URL  (default: https://seo-os.nico-510.workers.dev)
  SEO_OS_TOKEN  your account's secret agent token  (required)
  SEO_OS_DB     path to the local SQLite db  (default: /root/seo-os-dashboard/data/seo-os.sqlite)
Config file (optional, checked if env vars are missing): /root/.seo-os-sync.env

Usage:
  python3 seo_os_sync.py --dry-run     # show what WOULD be sent, send nothing
  python3 seo_os_sync.py --once        # send everything once (the one-time import / a manual refresh)
  python3 seo_os_sync.py               # run forever, pushing every --interval seconds (default 120)
  python3 seo_os_sync.py --interval 60
"""
from __future__ import annotations

import argparse
import json
import os
import re
import sqlite3
import subprocess
import sys
import time
import urllib.error
import urllib.request
import uuid
from datetime import datetime, timezone

DEFAULT_URL = "https://seo-os.nico-510.workers.dev"
DEFAULT_DB = "/root/seo-os-dashboard/data/seo-os.sqlite"
CONFIG_FILE = "/root/.seo-os-sync.env"

# Columns the hosted dashboard accepts per table. account_id is added by the
# server from your token, never sent from here. Anything not listed is dropped.
SYNC_COLUMNS = {
    "clients": ["id", "name", "domain", "role", "status", "health_score", "hermes_profile", "telegram_topic", "gsc_status", "ga4_status", "repo_status", "zernio_status", "workspace", "archived_at", "created_at", "updated_at"],
    "metrics_snapshots": ["id", "client_id", "period_label", "clicks", "clicks_delta", "impressions", "impressions_delta", "ctr", "ctr_delta", "avg_rank", "avg_rank_delta", "conversions", "created_at"],
    "opportunities": ["id", "client_id", "page", "problem", "opportunity_type", "priority", "impact", "confidence", "effort", "impressions", "clicks", "ctr", "position", "recommended_workflow", "status", "evidence_json", "created_at", "updated_at"],
    "approval_requests": ["id", "client_id", "title", "type", "risk", "status", "requested_action", "evidence", "source_url", "agent_confidence", "production_gate", "decision_note", "created_at", "updated_at"],
    "agent_tasks": ["id", "client_id", "title", "priority", "status", "source", "owner_profile", "page_asset", "next_action", "notes", "created_at", "updated_at"],
    "managed_jobs": ["id", "client_id", "name", "job_type", "cadence", "next_run", "last_run", "status", "model_policy", "data_sources", "latest_result", "managed_by"],
    "activity_events": ["id", "client_id", "source", "event_type", "status", "summary", "next_action", "artifact", "created_at"],
    "artifacts": ["id", "client_id", "title", "artifact_type", "status", "summary", "path_or_url", "updated_at"],
    "settings": ["key", "value"],
}


def load_config() -> dict:
    cfg = {}
    if os.path.exists(CONFIG_FILE):
        with open(CONFIG_FILE, encoding="utf-8") as fh:
            for line in fh:
                line = line.strip()
                if not line or line.startswith("#") or "=" not in line:
                    continue
                k, v = line.split("=", 1)
                cfg[k.strip()] = v.strip().strip('"').strip("'")
    url = os.environ.get("SEO_OS_URL") or cfg.get("SEO_OS_URL") or DEFAULT_URL
    token = os.environ.get("SEO_OS_TOKEN") or cfg.get("SEO_OS_TOKEN")
    db = os.environ.get("SEO_OS_DB") or cfg.get("SEO_OS_DB") or DEFAULT_DB
    return {"url": url.rstrip("/"), "token": token, "db": db}


def table_columns(conn: sqlite3.Connection, table: str) -> list:
    return [r[1] for r in conn.execute(f"PRAGMA table_info({table})")]


def sanitize_client(row: dict) -> dict:
    """Keep raw Telegram chat/thread IDs and absolute VPS paths on the server."""
    tt = (row.get("telegram_topic") or "").strip()
    if tt.startswith("telegram:") or (":" in tt and any(c.isdigit() for c in tt)):
        row["telegram_topic"] = "bound"
    elif not tt:
        row["telegram_topic"] = "not_bound"
    ws = (row.get("workspace") or "").strip().rstrip("/")
    row["workspace"] = os.path.basename(ws) if ws else ""
    return row


def build_payload(db_path: str) -> dict:
    if not os.path.exists(db_path):
        raise SystemExit(f"Database not found: {db_path}\nSet SEO_OS_DB to the right path.")
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    payload = {}
    existing = {r[0] for r in conn.execute("SELECT name FROM sqlite_master WHERE type='table'")}
    for table, allowed in SYNC_COLUMNS.items():
        if table not in existing:
            continue
        cols = [c for c in allowed if c in table_columns(conn, table)]
        if not cols:
            continue
        rows = []
        for r in conn.execute(f"SELECT {','.join(cols)} FROM {table}"):
            row = {c: r[c] for c in cols}
            if table == "clients":
                row = sanitize_client(row)
            rows.append(row)
        if rows:
            payload[table] = rows
    conn.close()
    return payload


def post_ingest(url: str, token: str, payload: dict) -> dict:
    data = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(
        f"{url}/agent/ingest",
        data=data,
        method="POST",
        headers={
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
            # Cloudflare's edge blocks the default "Python-urllib" User-Agent
            # (error 1010), so we send an explicit one.
            "User-Agent": "SEO-OS-Sync/1.0",
        },
    )
    with urllib.request.urlopen(req, timeout=30) as resp:
        return json.loads(resp.read().decode("utf-8"))


def push_once(cfg: dict, dry_run: bool = False) -> None:
    payload = build_payload(cfg["db"])
    counts = {t: len(rows) for t, rows in payload.items()}
    stamp = time.strftime("%Y-%m-%d %H:%M:%S")
    if dry_run:
        print(f"[{stamp}] DRY RUN. Would send: {counts}")
        sample = next(iter(payload.get("clients", [])), None)
        if sample:
            print("  sample client (sanitized):", json.dumps(sample))
        return
    if not cfg["token"]:
        raise SystemExit("Missing SEO_OS_TOKEN. Set it in the environment or in " + CONFIG_FILE)
    try:
        result = post_ingest(cfg["url"], cfg["token"], payload)
        print(f"[{stamp}] sent {counts} -> applied {result.get('applied')}")
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8", "replace")
        print(f"[{stamp}] HTTP {e.code} from dashboard: {body}", file=sys.stderr)
        raise SystemExit(1)
    except urllib.error.URLError as e:
        print(f"[{stamp}] could not reach dashboard: {e.reason}", file=sys.stderr)
        raise SystemExit(1)


# --- Pull side: apply operator decisions queued by the hosted dashboard ---------

def http_json(method: str, url: str, token: str, payload: dict | None = None) -> dict:
    """Generic JSON request to the hosted dashboard. Always sends the explicit
    User-Agent (Cloudflare's edge blocks the default "Python-urllib" one)."""
    data = json.dumps(payload).encode("utf-8") if payload is not None else None
    headers = {
        "Authorization": f"Bearer {token}",
        "User-Agent": "SEO-OS-Sync/1.0",
    }
    if data is not None:
        headers["Content-Type"] = "application/json"
    req = urllib.request.Request(url, data=data, method=method, headers=headers)
    with urllib.request.urlopen(req, timeout=30) as resp:
        return json.loads(resp.read().decode("utf-8"))


def claim_commands(cfg: dict, max: int = 10) -> list:
    result = http_json("GET", f"{cfg['url']}/agent/commands?max={max}", cfg["token"])
    return result.get("commands", [])


def complete_command(cfg: dict, cmd_id: str, status: str, result=None, error=None) -> None:
    http_json(
        "POST",
        f"{cfg['url']}/agent/commands/{cmd_id}/complete",
        cfg["token"],
        {"status": status, "result": result, "error": error},
    )


# ── Chat with Hermes (Phase C) ──────────────────────────────────────────────
# Chat now runs via the ACP relay (`hermes -p <profile> acp`, see run_acp_chat),
# NOT the old `hermes -z` path (which bypassed approvals). ACP gives Telegram
# parity: full tools + memory, per client, inside the client's folder, with file
# edits gated. Gated OFF by default; enable by setting SEO_OS_CHAT_ENABLED=true
# in the environment (e.g. the systemd EnvironmentFile). Reversible: unset to
# fall back to the polite "chat is off" reply.
CHAT_ENABLED = os.environ.get("SEO_OS_CHAT_ENABLED", "false").strip().lower() in ("1", "true", "yes")
SAFE_CHAT_TOOLSETS = "web,search,vision"  # legacy (old -z path only); unused by the ACP relay
CHAT_TIMEOUT_SECONDS = 180

# Stage 1 ACP relay: chat runs via `hermes -p <profile> acp`, driven by the
# bundled `acp` library from acp_chat.py, executed by the Hermes venv Python.
VENV_PY = os.environ.get("HERMES_VENV_PY", "/usr/local/lib/hermes-agent/venv/bin/python")
ACP_CHAT_SCRIPT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "acp_chat.py")


def compose_chat_prompt(body: str, client_name, section=None) -> str:
    scope = f'the client "{client_name}"' if client_name else "all clients (orchestrator overview)"
    where = f" They are currently viewing the '{section}' section of the dashboard, so prefer answers relevant to what they are looking at." if section else ""
    return (
        "You are answering the operator inside the SEO OS dashboard chat. "
        f"Scope: {scope}.{where} You may read, research, and draft. You CANNOT publish, deploy, "
        "redirect, change canonicals/noindex, delete, or send outreach. If you want to take an "
        "actionable step, DO NOT do it; instead end your reply with a fenced code block tagged "
        "'proposal' containing a JSON array, each item with keys: title, type, risk "
        "(low|medium|high), requested_action, evidence, source_url, production_gate, "
        "agent_confidence. Omit the block entirely if there is nothing to propose.\n\n"
        f"Operator: {body}"
    )


def parse_proposals(reply_text: str):
    """Split a reply into (display_text, [proposal dicts]). A missing or malformed
    proposal block is ignored so the reply text always still shows."""
    m = re.search(r"```proposal\s*(.*?)```", reply_text, re.DOTALL | re.IGNORECASE)
    if not m:
        return reply_text.strip(), []
    try:
        data = json.loads(m.group(1).strip())
    except Exception:
        return reply_text.strip(), []
    if isinstance(data, dict):
        data = [data]
    if not isinstance(data, list):
        return reply_text.strip(), []
    clean = (reply_text[: m.start()] + reply_text[m.end():]).strip()
    return (clean or reply_text.strip()), [p for p in data if isinstance(p, dict)][:10]


def run_hermes_oneshot(prompt: str, session_key: str, cwd) -> str:
    args = ["hermes", "-z", prompt, "-t", SAFE_CHAT_TOOLSETS, "--continue", session_key]
    kwargs = {"capture_output": True, "text": True, "timeout": CHAT_TIMEOUT_SECONDS}
    if cwd and os.path.isdir(cwd):
        kwargs["cwd"] = cwd
    cp = subprocess.run(args, **kwargs)
    if cp.returncode != 0:
        raise RuntimeError(f"hermes -z exited {cp.returncode}: {(cp.stderr or '')[-400:]}")
    return (cp.stdout or "").strip()


def run_acp_chat(profile: str, workspace: str, message: str, session_id,
                 timeout: int = CHAT_TIMEOUT_SECONDS):
    """Run one ACP chat turn via acp_chat.py (Hermes venv). Returns (reply, session_id)."""
    args = [VENV_PY, ACP_CHAT_SCRIPT, "--profile", profile,
            "--workspace", workspace, "--timeout", str(timeout)]
    if session_id:
        args += ["--session", session_id]
    cp = subprocess.run(args, input=message, capture_output=True, text=True,
                        timeout=timeout + 60)
    line = (cp.stdout or "").strip().splitlines()[-1] if (cp.stdout or "").strip() else ""
    try:
        data = json.loads(line)
    except Exception:
        raise RuntimeError(f"acp_chat bad output (rc={cp.returncode}): "
                           f"{(cp.stdout or '')[-300:]} {(cp.stderr or '')[-300:]}")
    if not data.get("ok"):
        raise RuntimeError(f"acp_chat error: {data.get('error')}")
    return data.get("reply", ""), data.get("session_id")


def ensure_chat_sessions_table(conn: sqlite3.Connection) -> None:
    conn.execute(
        "CREATE TABLE IF NOT EXISTS chat_sessions ("
        "session_key TEXT PRIMARY KEY, acp_session_id TEXT, updated_at TEXT)"
    )


def get_acp_session_id(conn: sqlite3.Connection, session_key: str):
    row = conn.execute(
        "SELECT acp_session_id FROM chat_sessions WHERE session_key=?", (session_key,)
    ).fetchone()
    return row["acp_session_id"] if row else None


def set_acp_session_id(conn: sqlite3.Connection, session_key: str, sid: str) -> None:
    conn.execute(
        "INSERT INTO chat_sessions (session_key, acp_session_id, updated_at) "
        "VALUES (?,?,datetime('now')) "
        "ON CONFLICT(session_key) DO UPDATE SET acp_session_id=excluded.acp_session_id, "
        "updated_at=excluded.updated_at",
        (session_key, sid),
    )


def apply_command(conn: sqlite3.Connection, cmd: dict) -> dict:
    """Apply one queued command to the LOCAL VPS SQLite. Returns
    {"status": "done"|"failed", "result"/"error"}. The local schema is the
    original server.py schema (NO account_id). Always use explicit column lists."""
    def uid(prefix: str) -> str:
        return f"{prefix}_{uuid.uuid4().hex[:10]}"

    def now() -> str:
        return datetime.now(timezone.utc).replace(microsecond=0).isoformat()

    try:
        cmd_type = cmd.get("type")
        payload = json.loads(cmd.get("payload_json") or "{}")

        if cmd_type == "execute_approved_task":
            approval_id = payload["approval_id"]
            source_url = payload.get("source_url", "") or ""
            title = payload.get("title", "") or ""
            requested_action = payload.get("requested_action", "") or ""
            note = payload.get("note", "") or ""

            appr = conn.execute(
                "SELECT * FROM approval_requests WHERE id=?", (approval_id,)
            ).fetchone()
            client_id = appr["client_id"] if appr else payload.get("client_id")

            prof_row = conn.execute(
                "SELECT hermes_profile FROM clients WHERE id=?", (client_id,)
            ).fetchone()
            hermes_profile = (prof_row["hermes_profile"] if prof_row else None) or "seo-agent"

            # Create/update the bounded task, keyed by page_asset. When the approval
            # has no source_url, key on a stable per-approval marker so a re-applied
            # command (e.g. after a 15-minute stale reclaim) UPDATEs the same task
            # instead of inserting a duplicate.
            effective_asset = source_url or f"approval:{approval_id}"
            existing = conn.execute(
                "SELECT id FROM agent_tasks WHERE page_asset=?", (effective_asset,)
            ).fetchone()
            if existing:
                conn.execute(
                    "UPDATE agent_tasks SET status='ready', source='Dashboard approval', "
                    "next_action=?, notes='Approved in SEO OS dashboard. Production remains "
                    "separately gated.', updated_at=? WHERE id=?",
                    (requested_action, now(), existing["id"]),
                )
                task_outcome = "updated"
            else:
                conn.execute(
                    "INSERT INTO agent_tasks (id,client_id,title,priority,status,source,"
                    "owner_profile,page_asset,next_action,notes,created_at,updated_at) "
                    "VALUES (?,?,?,?,?,?,?,?,?,?,?,?)",
                    (
                        uid("task"), client_id, f"Run approved workflow: {title}",
                        "high", "ready", "Dashboard approval", hermes_profile,
                        effective_asset, requested_action,
                        "Created from dashboard approval. Production remains separately gated.",
                        now(), now(),
                    ),
                )
                task_outcome = "created"

            # Converge the local approval so the bridge stops re-pushing 'needs_review'.
            conn.execute(
                "UPDATE approval_requests SET status='approved', decision_note=?, "
                "updated_at=? WHERE id=?",
                (note, now(), approval_id),
            )

            # Telegram confirm (best-effort, never fatal).
            telegram_sent = False
            try:
                tgt_row = conn.execute(
                    "SELECT telegram_topic FROM clients WHERE id=?", (client_id,)
                ).fetchone()
                target = (tgt_row["telegram_topic"] if tgt_row else None) or ""
                if target and target not in ("", "not_bound"):
                    msg = (
                        f"SEO OS: approved -> bounded task created for {title}. "
                        "Production remains separately gated."
                    )
                    subprocess.run(
                        ["hermes", "send", "--to", target, msg], timeout=30
                    )
                    telegram_sent = True
            except Exception:
                telegram_sent = False

            conn.commit()
            return {"status": "done", "result": {"task": task_outcome, "telegram": telegram_sent}}

        if cmd_type == "record_decision":
            decision = payload["decision"]
            note = payload.get("note", "") or ""
            approval_id = payload["approval_id"]
            conn.execute(
                "UPDATE approval_requests SET status=?, decision_note=?, updated_at=? WHERE id=?",
                (decision, note, now(), approval_id),
            )
            # Best-effort local activity row.
            try:
                conn.execute(
                    "INSERT INTO activity_events (id,client_id,source,event_type,status,"
                    "summary,next_action,artifact,created_at) VALUES (?,?,?,?,?,?,?,?,?)",
                    (
                        uid("ev"), payload.get("client_id"), "dashboard",
                        "approval_decision", "waiting",
                        f"Approval {decision.replace('_', ' ')}: {payload.get('title', '')}",
                        "Agent will wait for the next human instruction.",
                        payload.get("source_url", "") or "", now(),
                    ),
                )
            except Exception:
                pass
            conn.commit()
            return {"status": "done", "result": {"approval": decision}}

        if cmd_type == "chat_reply":
            # SAFETY HOLD: never invoke Hermes for chat until tool restriction is real.
            if not CHAT_ENABLED:
                return {"status": "done", "result": {
                    "reply_body": "Chat is temporarily turned off while we finish its safety setup. It will be back shortly.",
                    "proposals": [],
                }}
            client_id = payload.get("client_id")
            session_key = payload.get("session_key") or "dashboard-chat-orchestrator"
            body = payload.get("body") or ""
            client_name = None
            cwd = None
            if client_id:
                crow = conn.execute(
                    "SELECT name, domain, workspace FROM clients WHERE id=?", (client_id,)
                ).fetchone()
                if crow:
                    client_name = crow["name"]
                    ws = (crow["workspace"] or "").strip()
                    if ws and os.path.isdir(ws):
                        cwd = ws
                    elif crow["domain"] and os.path.isdir(f"/root/seo-sites/{crow['domain']}"):
                        cwd = f"/root/seo-sites/{crow['domain']}"
            elif os.path.isdir("/root/seo-sites/_orchestrator"):
                cwd = "/root/seo-sites/_orchestrator"

            ensure_chat_sessions_table(conn)
            profile = None
            if client_id:
                prow = conn.execute(
                    "SELECT hermes_profile FROM clients WHERE id=?", (client_id,)
                ).fetchone()
                profile = (prow["hermes_profile"] or "").strip() if prow else None
            profile = profile or "default"
            workspace = cwd or "/root"
            prior_sid = get_acp_session_id(conn, session_key)
            section = payload.get("section")
            reply, new_sid = run_acp_chat(
                profile, workspace, compose_chat_prompt(body, client_name, section), prior_sid)
            if new_sid:
                set_acp_session_id(conn, session_key, new_sid)
                conn.commit()
            clean, raw_proposals = parse_proposals(reply)

            proposals = []
            for p in raw_proposals:
                prop = {
                    "id": uid("appr"),
                    "client_id": p.get("client_id") or client_id or "all",
                    "title": str(p.get("title", "Hermes proposal"))[:300],
                    "type": str(p.get("type", "plan"))[:60],
                    "risk": str(p.get("risk", "medium"))[:20],
                    "requested_action": str(p.get("requested_action", ""))[:2000],
                    "evidence": str(p.get("evidence", ""))[:2000],
                    "source_url": str(p.get("source_url", ""))[:500],
                    "agent_confidence": str(p.get("agent_confidence", "medium"))[:60],
                    "production_gate": str(p.get("production_gate", "Production remains separately gated."))[:500],
                }
                # Best-effort write to the LOCAL approval_requests (source of truth). If the
                # local schema differs the Worker still mirrors it into D1 from the result.
                try:
                    conn.execute(
                        "INSERT INTO approval_requests (id,client_id,title,type,risk,status,"
                        "requested_action,evidence,source_url,agent_confidence,production_gate,"
                        "decision_note,created_at,updated_at) "
                        "VALUES (?,?,?,?,?,'needs_review',?,?,?,?,?,'',?,?)",
                        (prop["id"], prop["client_id"], prop["title"], prop["type"], prop["risk"],
                         prop["requested_action"], prop["evidence"], prop["source_url"],
                         prop["agent_confidence"], prop["production_gate"], now(), now()),
                    )
                except Exception:
                    pass
                proposals.append(prop)

            conn.commit()
            return {"status": "done", "result": {"reply_body": clean, "proposals": proposals}}

        return {"status": "failed", "error": f"unsupported command type: {cmd_type}"}
    except Exception as exc:  # never raise out of apply
        return {"status": "failed", "error": str(exc)}


def pull_once(cfg: dict) -> None:
    """Claim queued commands from the hosted dashboard, apply each to the local
    DB, and report completion. Never let one bad command kill the loop."""
    if not cfg["token"]:
        return
    stamp = time.strftime("%Y-%m-%d %H:%M:%S")
    try:
        cmds = claim_commands(cfg)
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8", "replace")
        print(f"[{stamp}] HTTP {e.code} claiming commands: {body}", file=sys.stderr)
        return
    except urllib.error.URLError as e:
        print(f"[{stamp}] could not reach dashboard to claim: {e.reason}", file=sys.stderr)
        return
    if not cmds:
        return
    # timeout=30: Hermes writes this same SQLite file, so wait for a busy lock
    # instead of failing the command outright (which would otherwise strand the
    # approval until the operator re-approves).
    conn = sqlite3.connect(cfg["db"], timeout=30)
    conn.row_factory = sqlite3.Row
    try:
        for cmd in cmds:
            r = apply_command(conn, cmd)
            try:
                complete_command(cfg, cmd["id"], r["status"], r.get("result"), r.get("error"))
            except Exception as e:
                print(f"[{stamp}] could not report command {cmd.get('id')}: {e}", file=sys.stderr)
            label = r.get("error") if r["status"] == "failed" else r.get("result")
            print(f"[{stamp}] command {cmd.get('id')} ({cmd.get('type')}) -> {r['status']}: {label}")
    finally:
        conn.close()


def main() -> None:
    ap = argparse.ArgumentParser(description="Push VPS SEO OS state to the hosted dashboard.")
    ap.add_argument("--once", action="store_true", help="send once and exit")
    ap.add_argument("--dry-run", action="store_true", help="show what would be sent, send nothing")
    ap.add_argument("--interval", type=int, default=120, help="seconds between full state PUSHES in loop mode")
    ap.add_argument("--command-interval", type=int, default=10, help="seconds between decision PULLS in loop mode (keeps approvals snappy)")
    args = ap.parse_args()
    cfg = load_config()
    print(f"SEO OS sync -> {cfg['url']}  (db: {cfg['db']})")
    if args.dry_run:
        push_once(cfg, dry_run=True)
        return
    if args.once:
        push_once(cfg)
        pull_once(cfg)
        return
    # Two cadences in one loop: pull operator decisions often (so an approval reaches
    # Hermes within ~command-interval, not a full push cycle), push full state rarely.
    cmd_every = max(2, args.command_interval)
    push_every = max(cmd_every, args.interval)
    print(f"Looping: push state every {push_every}s, pull decisions every {cmd_every}s. Ctrl-C to stop.")
    try:
        push_once(cfg)  # fresh on startup
    except SystemExit:
        raise
    except Exception as e:
        print(f"[{time.strftime('%Y-%m-%d %H:%M:%S')}] initial push error: {e}", file=sys.stderr)
    last_push = time.monotonic()
    while True:
        try:
            pull_once(cfg)
            if time.monotonic() - last_push >= push_every:
                push_once(cfg)
                last_push = time.monotonic()
        except SystemExit:
            raise
        except Exception as e:  # never let one bad tick kill the loop
            print(f"[{time.strftime('%Y-%m-%d %H:%M:%S')}] sync error: {e}", file=sys.stderr)
        time.sleep(cmd_every)


if __name__ == "__main__":
    main()
