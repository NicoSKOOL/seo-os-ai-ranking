-- Demo seed for the SEO OS hosted dashboard. FAKE DATA ONLY.
-- Ported from server.py seed_db() (server.py:182-251), scoped to one demo
-- account. This is the only data the public template ships. Real installs get
-- their data from their own VPS Hermes pushing through /agent/ingest, never
-- from this file.
--
-- Idempotent-ish: uses INSERT OR IGNORE so re-running will not duplicate rows.

-- One demo account. For the owner's private install, map your real Access email
-- to this account (see account_members below) or create a fresh account row.
INSERT OR IGNORE INTO accounts (id, name, plan, status) VALUES
  ('acct_demo', 'Demo Account', 'self_install', 'active');

-- Map an operator email to the demo account. Replace / add your real Access
-- email here when you wire up Cloudflare Access. The Worker also falls back to
-- acct_demo when no Access email is present (local dev), so dev works as-is.
INSERT OR IGNORE INTO account_members (account_id, email, role) VALUES
  ('acct_demo', 'operator@example.com', 'operator');

-- ── clients ────────────────────────────────────────────────────────────────
INSERT OR IGNORE INTO clients
  (id, account_id, name, domain, role, status, health_score, hermes_profile, telegram_topic, gsc_status, ga4_status, repo_status, zernio_status, workspace)
VALUES
  ('demo-local',   'acct_demo', 'Demo Local Roofing', 'demo-roofing.example', 'Local SEO client', 'active', 82, 'demo-local-seo', 'not_bound', 'connected',   'connected',   'connected',   'not_connected',  'demo-roofing'),
  ('demo-saas',    'acct_demo', 'Demo SaaS Company',  'demo-saas.example',    'B2B SaaS client',  'active', 76, 'demo-saas-seo',  'not_bound', 'connected',   'needs_setup', 'connected',   'not_applicable', 'demo-saas'),
  ('setup-client', 'acct_demo', 'New Client Template','new-client.example',   'Template client',  'setup',  45, 'new-client-seo', 'not_bound', 'needs_setup', 'needs_setup', 'needs_setup', 'needs_setup',    'new-client');

-- ── metrics_snapshots ──────────────────────────────────────────────────────
INSERT OR IGNORE INTO metrics_snapshots
  (id, account_id, client_id, period_label, clicks, clicks_delta, impressions, impressions_delta, ctr, ctr_delta, avg_rank, avg_rank_delta, conversions)
VALUES
  ('metric_local', 'acct_demo', 'demo-local',   'Last 28 days',  628,  94, 18420, 3100, 3.41,  0.32,  8.7, -1.4, 37),
  ('metric_saas',  'acct_demo', 'demo-saas',    'Last 28 days',  312, -18,  9610, 1440, 3.25, -0.41, 14.2,  0.8,  9),
  ('metric_setup', 'acct_demo', 'setup-client', 'Setup pending',   0,   0,     0,    0,    0,     0,    0,    0,  0);

-- ── opportunities ──────────────────────────────────────────────────────────
INSERT OR IGNORE INTO opportunities
  (id, account_id, client_id, page, problem, opportunity_type, priority, impact, confidence, effort, impressions, clicks, ctr, position, recommended_workflow, status, evidence_json)
VALUES
  ('opp_local_service', 'acct_demo', 'demo-local', 'https://demo-roofing.example/roof-repair/',                 'High impressions but weaker CTR than similar service pages', 'Low CTR',         'high',   'More booked inspection calls',     'high',   'low',    4200, 74, 1.76, 5.8, 'Compare local SERP snippets, then draft title/meta variants for approval.',          'new',           '{"source":"fake seeded demo snapshot","window":"28 days"}'),
  ('opp_local_city',    'acct_demo', 'demo-local', 'https://demo-roofing.example/locations/austin/',            'Page ranks near the top but lacks proof and FAQs',          'Content refresh', 'medium', 'More local-qualified enquiries',   'medium', 'medium', 1900, 51, 2.68, 7.4, 'Refresh content with proof, FAQs, internal links, and local schema recommendation.', 'task_created',  '{"source":"fake seeded demo snapshot","window":"28 days"}'),
  ('opp_saas_feature',  'acct_demo', 'demo-saas',  'https://demo-saas.example/features/reporting/',             'Position is strong but CTR is below expected range',        'Low CTR',         'high',   'More trial starts from existing rankings', 'high', 'low', 2600, 29, 1.12, 4.1, 'Draft CTR test and compare positioning against top SERP snippets.',                  'new',           '{"source":"fake seeded demo snapshot","window":"28 days"}'),
  ('opp_saas_blog',     'acct_demo', 'demo-saas',  'https://demo-saas.example/blog/seo-reporting-template/',    'Informational post can better route readers to the product','SERP gap',        'medium', 'More assisted conversions',        'medium', 'medium', 1700, 33, 1.94, 9.8, 'Run SERP gap analysis, add examples, then request approval for draft changes.',      'needs_approval','{"source":"fake seeded demo snapshot","window":"28 days"}');

-- ── approval_requests ──────────────────────────────────────────────────────
INSERT OR IGNORE INTO approval_requests
  (id, account_id, client_id, title, type, risk, status, requested_action, evidence, source_url, agent_confidence, production_gate, decision_note)
VALUES
  ('appr_saas_blog',  'acct_demo', 'demo-saas',  'Run SERP gap plan for reporting-template article', 'plan',   'low',  'needs_review', 'Create a content refresh plan and draft changes for review only.', 'The page has impressions and mid-page-one visibility but weak click-through and product routing.', 'https://demo-saas.example/blog/seo-reporting-template/', 'medium', 'Approving creates a planning task only. Production remains separately approval-gated.', ''),
  ('appr_local_meta', 'acct_demo', 'demo-local', 'Draft title/meta CTR test for roof repair page',   'plan',   'low',  'approved',     'Draft three title variants and two meta descriptions. Do not publish.', 'The page receives meaningful impressions and could improve CTR without creating a new URL.', 'https://demo-roofing.example/roof-repair/', 'high', 'Approved for drafting only, not publishing.', ''),
  ('appr_policy',     'acct_demo', 'all',        'Production changes remain approval-gated',          'policy', 'high', 'active',       'Keep as non-negotiable guardrail.', 'Deploys, publishing, redirects, canonicals, noindex, deletions, and outreach need explicit human approval.', '', 'high', 'Policy row, not an executable approval.', '');

-- ── agent_tasks ────────────────────────────────────────────────────────────
INSERT OR IGNORE INTO agent_tasks
  (id, account_id, client_id, title, priority, status, source, owner_profile, page_asset, next_action, notes)
VALUES
  ('task_local_meta', 'acct_demo', 'demo-local', 'Draft CTR test for roof repair page', 'high',   'ready',                'Approved plan',    'demo-local-seo', 'https://demo-roofing.example/roof-repair/',              'Prepare 3 title variants and 2 meta descriptions for approval.', 'Production remains separately gated.'),
  ('task_local_city', 'acct_demo', 'demo-local', 'Plan location page refresh',          'medium', 'backlog',              'SEO opportunity',  'demo-local-seo', 'https://demo-roofing.example/locations/austin/',         'Identify proof, FAQs, and internal links to add.', ''),
  ('task_saas_blog',  'acct_demo', 'demo-saas',  'Wait for SERP gap plan approval',     'high',   'waiting_for_approval', 'Approval request', 'demo-saas-seo',  'https://demo-saas.example/blog/seo-reporting-template/', 'Wait for approval decision in dashboard.', '');

-- ── managed_jobs ───────────────────────────────────────────────────────────
INSERT OR IGNORE INTO managed_jobs
  (id, account_id, client_id, name, job_type, cadence, next_run, last_run, status, model_policy, data_sources, latest_result, managed_by)
VALUES
  ('job_local_data',   'acct_demo', 'demo-local', 'Managed nightly SEO data refresh', 'data_refresh', 'Daily',               'Tonight 02:00',     'Today 02:04', 'ok',           'No model for pulls, cheap model for summaries', 'GSC, GA4, sitemap, crawl', 'Pulled fake demo metrics and refreshed opportunities.', 'SEO OS managed scheduler'),
  ('job_local_review', 'acct_demo', 'demo-local', 'Review monitor',                   'reviews',      'Daily when connected','Waiting for setup', 'Never',       'setup_needed', 'Cheap model for draft replies only',            'Review provider',          'Connect review source to activate workflow.', 'SEO OS managed scheduler'),
  ('job_saas_data',    'acct_demo', 'demo-saas',  'Managed nightly SEO data refresh', 'data_refresh', 'Daily',               'Tonight 02:30',     'Today 02:34', 'ok',           'No model for pulls, cheap model for summaries', 'GSC, sitemap, crawl',      'Metrics updated, one approval remains pending.', 'SEO OS managed scheduler');

-- ── activity_events ────────────────────────────────────────────────────────
INSERT OR IGNORE INTO activity_events
  (id, account_id, client_id, source, event_type, status, summary, next_action, artifact)
VALUES
  ('ev_1', 'acct_demo', 'all',          'dashboard',   'system',            'complete', 'SEO OS dashboard initialized with fake demo data',           'Connect real data sources in your own private install.', ''),
  ('ev_2', 'acct_demo', 'demo-local',   'managed_job', 'data_refreshed',    'complete', 'Demo Local Roofing metrics and opportunities refreshed',     'Review top CTR opportunities.', ''),
  ('ev_3', 'acct_demo', 'demo-saas',    'approval',    'approval_requested','waiting',  'Demo SaaS content refresh awaiting decision',                'Approve, reject, or request changes.', ''),
  ('ev_4', 'acct_demo', 'setup-client', 'setup',       'integration_needed','blocked',  'New client needs GSC, GA4, and review-source setup',         'Use Settings to track connections.', '');

-- ── artifacts ──────────────────────────────────────────────────────────────
INSERT OR IGNORE INTO artifacts
  (id, account_id, client_id, title, artifact_type, status, summary, storage, storage_key, visibility, path_or_url)
VALUES
  ('art_1', 'acct_demo', 'demo-local', 'Demo local SEO baseline report', 'report',      'tracked', 'Fake example report row for the template.', 'vps', 'reports/demo-local-baseline.md',     'private', 'reports/demo-local-baseline.md'),
  ('art_2', 'acct_demo', 'demo-saas',  'Demo SaaS opportunity report',   'html_report', 'tracked', 'Fake example report row for the template.', 'vps', 'reports/demo-saas-opportunities.html','private', 'reports/demo-saas-opportunities.html');

-- ── settings ───────────────────────────────────────────────────────────────
INSERT OR IGNORE INTO settings (account_id, key, value) VALUES
  ('acct_demo', 'scheduler_mode',  'SEO OS managed scheduler'),
  ('acct_demo', 'model_policy',    'Data pulls use no model. Summaries and labeling use a cheap configured model. Strategic plans use a stronger model only after approval.'),
  ('acct_demo', 'safe_actions',    'Dashboard approvals update state and create bounded tasks. Production actions need separate explicit approval.'),
  ('acct_demo', 'onboarding_goal', 'User connects GSC, GA4, and review data. SEO OS handles managed refresh jobs and approval loops.');
