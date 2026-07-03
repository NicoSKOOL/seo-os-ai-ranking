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
  ('demo-local',   'acct_demo', 'Demo Local Roofing', 'demo-roofing.example', 'Local SEO client', 'active', 82, 'demo-local-seo', 'not_bound', 'connected',   'connected',   'connected',   'connected',  'demo-roofing'),
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
  ('job_local_review', 'acct_demo', 'demo-local', 'Review monitor',                   'reviews',      'Daily when connected','Tonight 02:15',     'Today 02:19', 'ok',           'Cheap model for draft replies only',            'Review provider',          'Synced 14 reviews and drafted 3 replies for approval.', 'SEO OS managed scheduler'),
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

-- ── reviews (Google Business Profile, demo-local roofing client) ───────────
-- 14 reviews: 10 replied, 3 draft_ready (approvals below), 1 needs_reply.
-- Other demo clients keep zero reviews so the empty state is visible.
INSERT OR IGNORE INTO reviews
  (id, account_id, client_id, source, reviewer, rating, text, themes, published_at, reply_status, reply_text, replied_at, approval_id, created_at, updated_at)
VALUES
  ('rev_demo_01','acct_demo','demo-local','google','Marcus T.',5,'Roof replaced in two days and the crew left the yard cleaner than they found it. Foreman walked me through everything before starting.','quality work,friendly crew,communication','2025-08-14T15:00:00Z','replied','Thank you Marcus! The walkthrough before we start is exactly how we like to kick things off. Enjoy the new roof.','2025-08-15T09:00:00Z',NULL,'2025-08-14T15:00:00Z','2025-08-15T09:00:00Z'),
  ('rev_demo_02','acct_demo','demo-local','google','Elena P.',4,'Solid repair job on the flashing. Took a week longer to get on the schedule than quoted, but the work itself is great.','quality work,scheduling delays','2025-09-02T15:00:00Z','replied','Thanks Elena. You are right that we slipped on the start date, and we have added crew capacity since. Glad the repair itself holds up!','2025-09-03T09:00:00Z',NULL,'2025-09-02T15:00:00Z','2025-09-03T09:00:00Z'),
  ('rev_demo_03','acct_demo','demo-local','google','Dwayne R.',5,'Hail damage claim was a nightmare until these guys stepped in. They documented everything for the insurer and the new roof looks fantastic.','quality work,communication','2025-10-20T15:00:00Z','replied','Dwayne, insurance paperwork is half the job on hail claims. Happy we could carry that for you. Thanks for the kind words!','2025-10-21T09:00:00Z',NULL,'2025-10-20T15:00:00Z','2025-10-21T09:00:00Z'),
  ('rev_demo_04','acct_demo','demo-local','google','Sofia G.',5,'Friendly crew, honest pricing, no upsell games. They even fixed a gutter bracket for free while they were up there.','friendly crew,pricing','2025-11-05T15:00:00Z','replied','Thank you Sofia! Small fixes while we are already on the roof are on the house. See you at the next inspection.','2025-11-06T09:00:00Z',NULL,'2025-11-05T15:00:00Z','2025-11-06T09:00:00Z'),
  ('rev_demo_05','acct_demo','demo-local','google','Ken W.',3,'Work quality is fine but I had to call twice to get a date confirmed and the crew showed up an hour late.','scheduling delays,communication','2026-01-12T15:00:00Z','replied','Ken, thanks for the honest read. Two calls to confirm a date is two too many; we have moved scheduling to a shared calendar so this does not repeat.','2026-01-13T09:00:00Z',NULL,'2026-01-12T15:00:00Z','2026-01-13T09:00:00Z'),
  ('rev_demo_06','acct_demo','demo-local','google','Priya N.',5,'Best contractor experience we have had. Clear quote, daily updates, spotless cleanup.','communication,quality work,friendly crew','2026-02-03T15:00:00Z','replied','Priya, thank you! Daily updates are standard for every job we run. Enjoy the peace of mind.','2026-02-04T09:00:00Z',NULL,'2026-02-03T15:00:00Z','2026-02-04T09:00:00Z'),
  ('rev_demo_07','acct_demo','demo-local','google','Alan B.',4,'Good value for a full tear-off. Quote came in under two competitors. Minor delay waiting on shingle delivery.','pricing,scheduling delays','2026-02-18T15:00:00Z','replied','Thanks Alan. Material lead times bit us that week; glad the price and the finished roof made up for it.','2026-02-19T09:00:00Z',NULL,'2026-02-18T15:00:00Z','2026-02-19T09:00:00Z'),
  ('rev_demo_08','acct_demo','demo-local','google','Renata C.',5,'They found the leak two other companies missed. Fixed same visit.','quality work','2026-03-09T15:00:00Z','replied','Renata, leaks love to hide. Glad we could end the hunt on the first visit!','2026-03-10T09:00:00Z',NULL,'2026-03-09T15:00:00Z','2026-03-10T09:00:00Z'),
  ('rev_demo_09','acct_demo','demo-local','google','Tom H.',5,'Crew was respectful, quick, and the foreman answered every question my wife and I had.','friendly crew,communication','2026-04-14T15:00:00Z','replied','Thank you Tom! Questions are free and we would rather you ask ten than wonder about one.','2026-04-15T09:00:00Z',NULL,'2026-04-14T15:00:00Z','2026-04-15T09:00:00Z'),
  ('rev_demo_10','acct_demo','demo-local','google','Grace L.',5,'From estimate to cleanup, professional every step. Recommending to the whole street.','quality work,friendly crew','2026-05-06T15:00:00Z','replied','Grace, the whole street is welcome! Thank you for trusting us with the biggest surface of your home.','2026-05-07T09:00:00Z',NULL,'2026-05-06T15:00:00Z','2026-05-07T09:00:00Z'),
  ('rev_demo_11','acct_demo','demo-local','google','Victor M.',2,'Estimate took ten days to arrive and the start date moved twice. Roof is okay but the runaround soured it.','scheduling delays','2026-05-28T15:00:00Z','draft_ready','Victor, you are right to be frustrated: ten days for an estimate and two moved start dates is not the service we advertise. We have since assigned one coordinator per job so dates stop moving. If you are open to it, call and ask for Dave so we can make the next inspection visit free.',NULL,'appr_rev_01','2026-05-28T15:00:00Z','2026-05-28T15:00:00Z'),
  ('rev_demo_12','acct_demo','demo-local','google','Hannah S.',4,'Nice work on the ridge vents. Wish the crew had covered the flower beds better, some mulch got trampled.','quality work','2026-06-17T15:00:00Z','draft_ready','Thank you Hannah! You are right about the flower beds, and the crew lead has added ground covers to the standard setup checklist. If any plants took real damage, tell us and we will replace them.',NULL,'appr_rev_02','2026-06-17T15:00:00Z','2026-06-17T15:00:00Z'),
  ('rev_demo_13','acct_demo','demo-local','google','Omar F.',1,'Waited three weeks past the promised start and nobody called to explain. Went with another roofer.','scheduling delays,communication','2026-06-29T15:00:00Z','draft_ready','Omar, losing your job to silence is on us, full stop. Three weeks with no call is a communication failure we take seriously; the owner now reviews every delayed job weekly. We are sorry we let you down, and we wish you a great result with the roofer you chose.',NULL,'appr_rev_03','2026-06-29T15:00:00Z','2026-06-29T15:00:00Z'),
  ('rev_demo_14','acct_demo','demo-local','google','Beatriz A.',5,'Just had our inspection done. Thorough photos of every issue and zero pressure to buy anything.','communication,pricing','2026-07-01T15:00:00Z','needs_reply','',NULL,NULL,'2026-07-01T15:00:00Z','2026-07-01T15:00:00Z');

-- ── review reply drafts awaiting approval (one per draft_ready review) ─────
INSERT OR IGNORE INTO approval_requests
  (id, account_id, client_id, title, type, risk, status, requested_action, evidence, source_url, agent_confidence, production_gate, created_at, updated_at)
VALUES
  ('appr_rev_01','acct_demo','demo-local','Reply to Victor M. (2 stars) - Demo Local Roofing','review_reply','low','needs_review','Victor, you are right to be frustrated: ten days for an estimate and two moved start dates is not the service we advertise. We have since assigned one coordinator per job so dates stop moving. If you are open to it, call and ask for Dave so we can make the next inspection visit free.','Estimate took ten days to arrive and the start date moved twice. Roof is okay but the runaround soured it.','','high','Replying never touches the website. Posting still requires this approval.','2026-05-28T16:00:00Z','2026-05-28T16:00:00Z'),
  ('appr_rev_02','acct_demo','demo-local','Reply to Hannah S. (4 stars) - Demo Local Roofing','review_reply','low','needs_review','Thank you Hannah! You are right about the flower beds, and the crew lead has added ground covers to the standard setup checklist. If any plants took real damage, tell us and we will replace them.','Nice work on the ridge vents. Wish the crew had covered the flower beds better, some mulch got trampled.','','high','Replying never touches the website. Posting still requires this approval.','2026-06-17T16:00:00Z','2026-06-17T16:00:00Z'),
  ('appr_rev_03','acct_demo','demo-local','Reply to Omar F. (1 star) - Demo Local Roofing','review_reply','medium','needs_review','Omar, losing your job to silence is on us, full stop. Three weeks with no call is a communication failure we take seriously; the owner now reviews every delayed job weekly. We are sorry we let you down, and we wish you a great result with the roofer you chose.','Waited three weeks past the promised start and nobody called to explain. Went with another roofer.','','high','Replying never touches the website. Posting still requires this approval.','2026-06-29T16:00:00Z','2026-06-29T16:00:00Z');
