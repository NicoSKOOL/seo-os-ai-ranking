-- SEO OS local (VPS) SQLite schema: the 9 operational tables, extracted from
-- server.py so install-vps.sh can create the db without running the Flask app.
-- The bridge (seo_os_sync.py) creates its own chat_sessions table at runtime.
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
