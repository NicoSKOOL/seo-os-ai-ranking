#!/usr/bin/env python3
"""SEO OS template dashboard server.

Stdlib-only on purpose: easy to run on a VPS without npm, Docker, or a hosted
DB. The first run creates a local SQLite database with fake demo data only.
Do not commit generated data/ databases from real installs.
"""
from __future__ import annotations

import argparse
import datetime as dt
import json
import sqlite3
import uuid
from http import HTTPStatus
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import parse_qs, urlparse

ROOT = Path(__file__).resolve().parent
STATIC = ROOT / "static"
DB_PATH = ROOT / "data" / "seo-os.sqlite"
UTC = dt.timezone.utc

SCHEMA = """
PRAGMA journal_mode=WAL;
CREATE TABLE IF NOT EXISTS clients (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  domain TEXT NOT NULL,
  role TEXT NOT NULL,
  status TEXT NOT NULL,
  health_score INTEGER NOT NULL,
  hermes_profile TEXT NOT NULL,
  telegram_topic TEXT NOT NULL,
  gsc_status TEXT NOT NULL,
  ga4_status TEXT NOT NULL,
  repo_status TEXT NOT NULL,
  zernio_status TEXT NOT NULL DEFAULT 'not_connected',
  workspace TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS metrics_snapshots (
  id TEXT PRIMARY KEY,
  client_id TEXT NOT NULL,
  period_label TEXT NOT NULL,
  clicks INTEGER NOT NULL,
  clicks_delta INTEGER NOT NULL,
  impressions INTEGER NOT NULL,
  impressions_delta INTEGER NOT NULL,
  ctr REAL NOT NULL,
  ctr_delta REAL NOT NULL,
  avg_rank REAL NOT NULL,
  avg_rank_delta REAL NOT NULL,
  conversions INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS opportunities (
  id TEXT PRIMARY KEY,
  client_id TEXT NOT NULL,
  page TEXT NOT NULL,
  problem TEXT NOT NULL,
  opportunity_type TEXT NOT NULL,
  priority TEXT NOT NULL,
  impact TEXT NOT NULL,
  confidence TEXT NOT NULL,
  effort TEXT NOT NULL,
  impressions INTEGER NOT NULL,
  clicks INTEGER NOT NULL,
  ctr REAL NOT NULL,
  position REAL NOT NULL,
  recommended_workflow TEXT NOT NULL,
  status TEXT NOT NULL,
  evidence_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS approval_requests (
  id TEXT PRIMARY KEY,
  client_id TEXT NOT NULL,
  title TEXT NOT NULL,
  type TEXT NOT NULL,
  risk TEXT NOT NULL,
  status TEXT NOT NULL,
  requested_action TEXT NOT NULL,
  evidence TEXT NOT NULL,
  source_url TEXT NOT NULL,
  agent_confidence TEXT NOT NULL,
  production_gate TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  decision_note TEXT NOT NULL DEFAULT ''
);
CREATE TABLE IF NOT EXISTS agent_tasks (
  id TEXT PRIMARY KEY,
  client_id TEXT NOT NULL,
  title TEXT NOT NULL,
  priority TEXT NOT NULL,
  status TEXT NOT NULL,
  source TEXT NOT NULL,
  owner_profile TEXT NOT NULL,
  page_asset TEXT NOT NULL,
  next_action TEXT NOT NULL,
  notes TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS managed_jobs (
  id TEXT PRIMARY KEY,
  client_id TEXT NOT NULL,
  name TEXT NOT NULL,
  job_type TEXT NOT NULL,
  cadence TEXT NOT NULL,
  next_run TEXT NOT NULL,
  last_run TEXT NOT NULL,
  status TEXT NOT NULL,
  model_policy TEXT NOT NULL,
  data_sources TEXT NOT NULL,
  latest_result TEXT NOT NULL,
  managed_by TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS activity_events (
  id TEXT PRIMARY KEY,
  client_id TEXT NOT NULL,
  source TEXT NOT NULL,
  event_type TEXT NOT NULL,
  status TEXT NOT NULL,
  summary TEXT NOT NULL,
  next_action TEXT NOT NULL,
  artifact TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS artifacts (
  id TEXT PRIMARY KEY,
  client_id TEXT NOT NULL,
  title TEXT NOT NULL,
  artifact_type TEXT NOT NULL,
  status TEXT NOT NULL,
  summary TEXT NOT NULL,
  path_or_url TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
"""


def now() -> str:
    return dt.datetime.now(UTC).replace(microsecond=0).isoformat()


def uid(prefix: str) -> str:
    return f"{prefix}_{uuid.uuid4().hex[:10]}"


def connect() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def rows(conn: sqlite3.Connection, sql: str, params=()):
    return [dict(r) for r in conn.execute(sql, params).fetchall()]


def one(conn: sqlite3.Connection, sql: str, params: tuple = ()) -> dict | None:
    r = conn.execute(sql, params).fetchone()
    return dict(r) if r else None


def init_db(seed: bool = True) -> None:
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    with connect() as conn:
        conn.executescript(SCHEMA)
        if seed and one(conn, "SELECT id FROM clients LIMIT 1") is None:
            seed_db(conn)


def seed_db(conn: sqlite3.Connection) -> None:
    """Seed fake demo data only. Replace this through setup/onboarding in real installs."""
    t = now()
    clients = [
        ("demo-local", "Demo Local Roofing", "demo-roofing.example", "Local SEO client", "active", 82, "demo-local-seo", "not_bound", "connected", "connected", "connected", "not_connected", "/opt/seo-os/workspaces/demo-roofing"),
        ("demo-saas", "Demo SaaS Company", "demo-saas.example", "B2B SaaS client", "active", 76, "demo-saas-seo", "not_bound", "connected", "needs_setup", "connected", "not_applicable", "/opt/seo-os/workspaces/demo-saas"),
        ("setup-client", "New Client Template", "new-client.example", "Template client", "setup", 45, "new-client-seo", "not_bound", "needs_setup", "needs_setup", "needs_setup", "needs_setup", "/opt/seo-os/workspaces/new-client"),
    ]
    conn.executemany("INSERT INTO clients VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)", [(*c, t, t) for c in clients])

    metrics = [
        ("metric_local", "demo-local", "Last 28 days", 628, 94, 18420, 3100, 3.41, 0.32, 8.7, -1.4, 37, t),
        ("metric_saas", "demo-saas", "Last 28 days", 312, -18, 9610, 1440, 3.25, -0.41, 14.2, 0.8, 9, t),
        ("metric_setup", "setup-client", "Setup pending", 0, 0, 0, 0, 0, 0, 0, 0, 0, t),
    ]
    conn.executemany("INSERT INTO metrics_snapshots VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)", metrics)

    opps = [
        ("opp_local_service", "demo-local", "https://demo-roofing.example/roof-repair/", "High impressions but weaker CTR than similar service pages", "Low CTR", "high", "More booked inspection calls", "high", "low", 4200, 74, 1.76, 5.8, "Compare local SERP snippets, then draft title/meta variants for approval.", "new"),
        ("opp_local_city", "demo-local", "https://demo-roofing.example/locations/austin/", "Page ranks near the top but lacks proof and FAQs", "Content refresh", "medium", "More local-qualified enquiries", "medium", "medium", 1900, 51, 2.68, 7.4, "Refresh content with proof, FAQs, internal links, and local schema recommendation.", "task_created"),
        ("opp_saas_feature", "demo-saas", "https://demo-saas.example/features/reporting/", "Position is strong but CTR is below expected range", "Low CTR", "high", "More trial starts from existing rankings", "high", "low", 2600, 29, 1.12, 4.1, "Draft CTR test and compare positioning against top SERP snippets.", "new"),
        ("opp_saas_blog", "demo-saas", "https://demo-saas.example/blog/seo-reporting-template/", "Informational post can better route readers to the product", "SERP gap", "medium", "More assisted conversions", "medium", "medium", 1700, 33, 1.94, 9.8, "Run SERP gap analysis, add examples, then request approval for draft changes.", "needs_approval"),
    ]
    conn.executemany(
        "INSERT INTO opportunities VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
        [(*o, json.dumps({"source": "fake seeded demo snapshot", "window": "28 days"}), t, t) for o in opps],
    )

    approvals = [
        ("appr_saas_blog", "demo-saas", "Run SERP gap plan for reporting-template article", "plan", "low", "needs_review", "Create a content refresh plan and draft changes for review only.", "The page has impressions and mid-page-one visibility but weak click-through and product routing.", "https://demo-saas.example/blog/seo-reporting-template/", "medium", "Approving creates a planning task only. Production remains separately approval-gated."),
        ("appr_local_meta", "demo-local", "Draft title/meta CTR test for roof repair page", "plan", "low", "approved", "Draft three title variants and two meta descriptions. Do not publish.", "The page receives meaningful impressions and could improve CTR without creating a new URL.", "https://demo-roofing.example/roof-repair/", "high", "Approved for drafting only, not publishing."),
        ("appr_policy", "all", "Production changes remain approval-gated", "policy", "high", "active", "Keep as non-negotiable guardrail.", "Deploys, publishing, redirects, canonicals, noindex, deletions, and outreach need explicit human approval.", "", "high", "Policy row, not an executable approval."),
    ]
    conn.executemany("INSERT INTO approval_requests VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)", [(*a, t, t, "") for a in approvals])

    tasks = [
        ("task_local_meta", "demo-local", "Draft CTR test for roof repair page", "high", "ready", "Approved plan", "demo-local-seo", "https://demo-roofing.example/roof-repair/", "Prepare 3 title variants and 2 meta descriptions for approval.", "Production remains separately gated."),
        ("task_local_city", "demo-local", "Plan location page refresh", "medium", "backlog", "SEO opportunity", "demo-local-seo", "https://demo-roofing.example/locations/austin/", "Identify proof, FAQs, and internal links to add.", ""),
        ("task_saas_blog", "demo-saas", "Wait for SERP gap plan approval", "high", "waiting_for_approval", "Approval request", "demo-saas-seo", "https://demo-saas.example/blog/seo-reporting-template/", "Wait for approval decision in dashboard.", ""),
    ]
    conn.executemany("INSERT INTO agent_tasks VALUES (?,?,?,?,?,?,?,?,?,?,?,?)", [(*x, t, t) for x in tasks])

    jobs = [
        ("job_local_data", "demo-local", "Managed nightly SEO data refresh", "data_refresh", "Daily", "Tonight 02:00", "Today 02:04", "ok", "No model for pulls, cheap model for summaries", "GSC, GA4, sitemap, crawl", "Pulled fake demo metrics and refreshed opportunities.", "SEO OS managed scheduler"),
        ("job_local_review", "demo-local", "Review monitor", "reviews", "Daily when connected", "Waiting for setup", "Never", "setup_needed", "Cheap model for draft replies only", "Review provider", "Connect review source to activate workflow.", "SEO OS managed scheduler"),
        ("job_saas_data", "demo-saas", "Managed nightly SEO data refresh", "data_refresh", "Daily", "Tonight 02:30", "Today 02:34", "ok", "No model for pulls, cheap model for summaries", "GSC, sitemap, crawl", "Metrics updated, one approval remains pending.", "SEO OS managed scheduler"),
    ]
    conn.executemany("INSERT INTO managed_jobs VALUES (?,?,?,?,?,?,?,?,?,?,?,?)", jobs)

    events = [
        ("ev_1", "all", "dashboard", "system", "complete", "SEO OS template dashboard initialized with fake demo data", "Connect real data sources in your own private install.", "", t),
        ("ev_2", "demo-local", "managed_job", "data_refreshed", "complete", "Demo Local Roofing metrics and opportunities refreshed", "Review top CTR opportunities.", "", t),
        ("ev_3", "demo-saas", "approval", "approval_requested", "waiting", "Demo SaaS content refresh awaiting decision", "Approve, reject, or request changes.", "", t),
        ("ev_4", "setup-client", "setup", "integration_needed", "blocked", "New client needs GSC, GA4, and review-source setup", "Use Settings to track connections.", "", t),
    ]
    conn.executemany("INSERT INTO activity_events VALUES (?,?,?,?,?,?,?,?,?)", events)

    artifacts = [
        ("art_1", "demo-local", "Demo local SEO baseline report", "report", "tracked", "Fake example report row for the template.", "reports/demo-local-baseline.md", t),
        ("art_2", "demo-saas", "Demo SaaS opportunity report", "html_report", "tracked", "Fake example report row for the template.", "reports/demo-saas-opportunities.html", t),
    ]
    conn.executemany("INSERT INTO artifacts VALUES (?,?,?,?,?,?,?,?)", artifacts)

    settings = {
        "scheduler_mode": "SEO OS managed scheduler",
        "model_policy": "Data pulls use no model. Summaries and labeling use a cheap configured model. Strategic plans use a stronger model only after approval.",
        "safe_actions": "Dashboard approvals update state and create bounded tasks. Production actions need separate explicit approval.",
        "onboarding_goal": "User connects GSC, GA4, and review data. SEO OS handles managed refresh jobs and approval loops.",
    }
    conn.executemany("INSERT INTO settings VALUES (?,?)", settings.items())


def summary(conn: sqlite3.Connection, client_id: str = "all") -> dict:
    clients = rows(conn, "SELECT * FROM clients ORDER BY CASE status WHEN 'active' THEN 0 ELSE 1 END, name")
    metrics = rows(conn, "SELECT * FROM metrics_snapshots")
    approvals = rows(conn, "SELECT * FROM approval_requests ORDER BY CASE status WHEN 'needs_review' THEN 0 WHEN 'approved' THEN 1 ELSE 2 END, updated_at DESC")
    opps = rows(conn, "SELECT * FROM opportunities ORDER BY CASE priority WHEN 'high' THEN 0 WHEN 'medium' THEN 1 ELSE 2 END, impressions DESC")
    tasks = rows(conn, "SELECT * FROM agent_tasks ORDER BY CASE priority WHEN 'high' THEN 0 WHEN 'medium' THEN 1 ELSE 2 END, updated_at DESC")
    jobs = rows(conn, "SELECT * FROM managed_jobs ORDER BY CASE status WHEN 'setup_needed' THEN 0 WHEN 'failed' THEN 1 ELSE 2 END, next_run")
    events = rows(conn, "SELECT * FROM activity_events ORDER BY created_at DESC LIMIT 30")
    artifacts = rows(conn, "SELECT * FROM artifacts ORDER BY updated_at DESC")
    settings = {r["key"]: r["value"] for r in conn.execute("SELECT * FROM settings")}

    def match(row: dict) -> bool:
        return client_id == "all" or row.get("client_id") == client_id

    visible_clients = clients if client_id == "all" else [c for c in clients if c["id"] == client_id]
    data = {
        "generated_at": now(),
        "active_client": client_id,
        "clients": clients,
        "visible_clients": visible_clients,
        "metrics": [m for m in metrics if client_id == "all" or m["client_id"] == client_id],
        "approvals": [a for a in approvals if match(a)],
        "opportunities": [o for o in opps if match(o)],
        "tasks": [t for t in tasks if match(t)],
        "jobs": [j for j in jobs if match(j)],
        "events": [e for e in events if match(e)],
        "artifacts": [a for a in artifacts if match(a)],
        "settings": settings,
    }
    data["kpis"] = {
        "pending_approvals": sum(1 for a in approvals if a["status"] == "needs_review" and match(a)),
        "open_tasks": sum(1 for t in tasks if t["status"] not in ("done", "cancelled") and match(t)),
        "high_impact_opportunities": sum(1 for o in opps if o["priority"] == "high" and match(o)),
        "active_jobs": sum(1 for j in jobs if j["status"] in ("ok", "running", "setup_needed") and match(j)),
        "sites_monitored": len(visible_clients),
        "system_health": "OK" if not any(j["status"] == "failed" for j in jobs if match(j)) else "Issue",
    }
    return data


class Handler(SimpleHTTPRequestHandler):
    server_version = "SEOOSTemplate/0.1"

    def translate_path(self, path: str) -> str:
        parsed = urlparse(path).path
        if parsed == "/":
            return str(STATIC / "index.html")
        return str(STATIC / parsed.lstrip("/"))

    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        super().end_headers()

    def json_response(self, payload: dict, status: int = 200) -> None:
        body = json.dumps(payload, indent=2).encode()
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def read_json(self) -> dict:
        length = int(self.headers.get("Content-Length", "0"))
        if not length:
            return {}
        return json.loads(self.rfile.read(length).decode())

    def do_GET(self):
        parsed = urlparse(self.path)
        if parsed.path == "/api/summary":
            client = parse_qs(parsed.query).get("client", ["all"])[0]
            with connect() as conn:
                self.json_response(summary(conn, client))
            return
        if parsed.path == "/api/health":
            with connect() as conn:
                count = one(conn, "SELECT COUNT(*) AS n FROM clients")
            self.json_response({"ok": True, "clients": count["n"], "db": str(DB_PATH)})
            return
        return super().do_GET()

    def do_POST(self):
        parsed = urlparse(self.path)
        body = self.read_json()
        if parsed.path.startswith("/api/approvals/") and parsed.path.endswith("/decision"):
            approval_id = parsed.path.split("/")[3]
            decision = body.get("decision", "").strip()
            note = body.get("note", "").strip()
            allowed = {"approved", "needs_changes", "rejected", "needs_review"}
            if decision not in allowed:
                self.json_response({"ok": False, "error": "Invalid decision"}, 400)
                return
            with connect() as conn:
                appr = one(conn, "SELECT * FROM approval_requests WHERE id=?", (approval_id,))
                if not appr:
                    self.json_response({"ok": False, "error": "Approval not found"}, 404)
                    return
                t = now()
                conn.execute("UPDATE approval_requests SET status=?, decision_note=?, updated_at=? WHERE id=?", (decision, note, t, approval_id))
                conn.execute("INSERT INTO activity_events VALUES (?,?,?,?,?,?,?,?,?)", (
                    uid("ev"), appr["client_id"], "dashboard", "approval_decision", "complete",
                    f"Approval {decision.replace('_', ' ')}: {appr['title']}",
                    "SEO OS watcher can create/update the bounded agent task." if decision == "approved" else "Agent will wait for the next human instruction.",
                    appr["source_url"], t,
                ))
                if decision == "approved" and appr["type"] != "policy":
                    existing = one(conn, "SELECT id FROM agent_tasks WHERE page_asset=?", (appr["source_url"],))
                    if not existing:
                        client = one(conn, "SELECT hermes_profile FROM clients WHERE id=?", (appr["client_id"],)) or {"hermes_profile": "seo-agent"}
                        conn.execute("INSERT INTO agent_tasks VALUES (?,?,?,?,?,?,?,?,?,?,?,?)", (
                            uid("task"), appr["client_id"], f"Run approved workflow: {appr['title']}", "high", "ready", "Approval request",
                            client["hermes_profile"], appr["source_url"], appr["requested_action"], "Created from dashboard approval. Production remains separately gated.", t, t,
                        ))
                    else:
                        conn.execute(
                            "UPDATE agent_tasks SET status=?, source=?, next_action=?, notes=?, updated_at=? WHERE id=?",
                            ("ready", "Dashboard approval", appr["requested_action"], "Approved in SEO OS dashboard. Production remains separately gated.", t, existing["id"]),
                        )
                conn.commit()
                self.json_response({"ok": True, "summary": summary(conn, "all")})
            return
        if parsed.path == "/api/refresh":
            client_id = body.get("client_id", "all")
            with connect() as conn:
                t = now()
                conn.execute("INSERT INTO activity_events VALUES (?,?,?,?,?,?,?,?,?)", (
                    uid("ev"), client_id if client_id != "all" else "all", "dashboard", "data_refresh", "complete",
                    "Manual dashboard refresh simulated. Real installs should call managed SEO OS data jobs.",
                    "Review updated opportunities and approvals.", "", t,
                ))
                conn.commit()
                self.json_response({"ok": True, "summary": summary(conn, client_id)})
            return
        if parsed.path.startswith("/api/clients/") and parsed.path.endswith("/delete"):
            client_id = parsed.path.split("/")[3]
            confirm = body.get("confirm", "").strip()
            if client_id in ("", "all") or confirm != "DELETE":
                self.json_response({"ok": False, "error": "Client delete requires confirm=DELETE and a real client id"}, 400)
                return
            with connect() as conn:
                client = one(conn, "SELECT * FROM clients WHERE id=?", (client_id,))
                if not client:
                    self.json_response({"ok": False, "error": "Client not found"}, 404)
                    return
                t = now()
                deleted_counts = {}
                for table in ("metrics_snapshots", "opportunities", "approval_requests", "agent_tasks", "managed_jobs", "artifacts"):
                    cur = conn.execute(f"DELETE FROM {table} WHERE client_id=?", (client_id,))
                    deleted_counts[table] = cur.rowcount
                conn.execute("INSERT INTO activity_events VALUES (?,?,?,?,?,?,?,?,?)", (
                    uid("ev"), "all", "dashboard", "client_deleted", "complete",
                    f"Deleted client from SEO OS dashboard: {client['name']}",
                    "All client-scoped prototype rows were removed. Production v1 should archive before destructive delete.",
                    "", t,
                ))
                cur = conn.execute("DELETE FROM activity_events WHERE client_id=?", (client_id,))
                deleted_counts["activity_events"] = cur.rowcount
                conn.execute("DELETE FROM clients WHERE id=?", (client_id,))
                conn.commit()
                self.json_response({"ok": True, "deleted_client": client_id, "deleted_counts": deleted_counts, "summary": summary(conn, "all")})
            return
        self.json_response({"ok": False, "error": "Not found"}, HTTPStatus.NOT_FOUND)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--host", default="127.0.0.1")
    parser.add_argument("--port", type=int, default=8787)
    parser.add_argument("--reset", action="store_true", help="Delete and reseed SQLite database")
    args = parser.parse_args()
    if args.reset and DB_PATH.exists():
        DB_PATH.unlink()
    init_db(seed=True)
    httpd = ThreadingHTTPServer((args.host, args.port), Handler)
    print(f"SEO OS dashboard running at http://{args.host}:{args.port}")
    print(f"SQLite: {DB_PATH}")
    httpd.serve_forever()


if __name__ == "__main__":
    main()
