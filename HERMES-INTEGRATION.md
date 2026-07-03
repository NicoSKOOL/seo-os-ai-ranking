# Hermes integration: what to write, where it shows up

Your dashboard is only as alive as your local database. The bridge
(`seo_os_sync.py`, installed on your VPS by `install-vps.sh`) reads
`/root/seo-os-dashboard/data/seo-os.sqlite` every couple of minutes and pushes
whatever rows it finds up to your hosted dashboard. Nothing appears on a
dashboard screen until a matching row exists in that local database.

This file is the conventions contract: one section per table, which screen it
lights up, the columns that matter, and a working `INSERT` you (or your
Hermes agent) can run to test it. The column lists below are copied exactly
from `SYNC_COLUMNS` in `scripts/seo_os_sync.py`, the single source of truth
for what the bridge will actually sync. Anything you write that is not in
that list gets dropped before it ever leaves your VPS.

All examples below insert against the local schema at
`dashboard/db/local-schema.sql` (the same schema `install-vps.sh` creates at
`/root/seo-os-dashboard/data/seo-os.sqlite`). They use a generic example
client, `my-client`, and a generic domain, `example.com`. Substitute your own
client id and data.

## clients

**Screen:** Clients / Sites (and the Client Health Summary on Command Center).

**Columns that matter:**
`id, name, domain, role, status, health_score, hermes_profile,
telegram_topic, gsc_status, ga4_status, repo_status, zernio_status,
workspace, archived_at, created_at, updated_at`

**Example:**

```sql
INSERT INTO clients (id,name,domain,role,status,health_score,hermes_profile,
                      telegram_topic,gsc_status,ga4_status,repo_status,
                      workspace,created_at,updated_at)
VALUES ('my-client','Acme Dental','example.com','client','active',82,
        'acme-dental','not_bound','connected','connected','connected',
        '/root/seo-sites/example.com','2026-07-03T00:00:00Z',
        '2026-07-03T00:00:00Z');
```

`install-vps.sh` already creates one `clients` row per client you register
during the VPS install. You only need this yourself if you are adding a
client outside that flow, or updating one of its status fields.

## metrics_snapshots

**Screen:** Command Center (the "28-Day Performance" cards).

**Columns that matter:**
`id, client_id, period_label, clicks, clicks_delta, impressions,
impressions_delta, ctr, ctr_delta, avg_rank, avg_rank_delta, conversions,
created_at`

**Example:**

```sql
INSERT INTO metrics_snapshots (id,client_id,period_label,clicks,clicks_delta,
                                impressions,impressions_delta,ctr,ctr_delta,
                                avg_rank,avg_rank_delta,conversions,
                                created_at)
VALUES ('metrics_001','my-client','Last 28 days',412,38,15200,900,2.7,0.3,
        14.2,-1.1,9,'2026-07-03T00:00:00Z');
```

Write one row per client per reporting period (weekly or every 28 days is
typical). The dashboard only shows the most recent snapshot per client, so an
agent running a scheduled performance-reporting workflow should insert a new
row each time it refreshes GSC data, not update an old one.

## opportunities

**Screen:** Opportunities (and it feeds the "High-Impact SEO Opportunities"
table on Command Center, the Content Pipeline view, and CTR Tests).

**Columns that matter:**
`id, client_id, page, problem, opportunity_type, priority, impact,
confidence, effort, impressions, clicks, ctr, position,
recommended_workflow, status, evidence_json, created_at, updated_at`

**Example:**

```sql
INSERT INTO opportunities (id,client_id,page,problem,opportunity_type,
                            priority,impact,confidence,effort,impressions,
                            clicks,ctr,position,recommended_workflow,status,
                            evidence_json,created_at,updated_at)
VALUES ('opp_001','my-client','https://example.com/services/teeth-whitening',
        'High impressions, low CTR','Low CTR','high','high','medium','low',
        8400,62,0.7,6.4,
        'Rewrite title and meta description to match search intent',
        'needs_review','{}','2026-07-03T00:00:00Z','2026-07-03T00:00:00Z');
```

`opportunity_type` drives which secondary views pick the row up: use
`Content refresh`, `SERP gap`, or `Striking distance` to also surface it on
the Content Pipeline screen, and a low `ctr` value (or `opportunity_type` of
`Low CTR`) to also surface it on CTR Tests.

## approval_requests

**Screen:** Approvals.

**Columns that matter:**
`id, client_id, title, type, risk, status, requested_action, evidence,
source_url, agent_confidence, production_gate, decision_note, created_at,
updated_at`

**Example:**

```sql
INSERT INTO approval_requests (id,client_id,title,type,risk,status,
                                requested_action,evidence,source_url,
                                agent_confidence,production_gate,
                                decision_note,created_at,updated_at)
VALUES ('appr_001','my-client',
        'Rewrite title tag for the teeth whitening page','content','low',
        'needs_review',
        'Update the title tag and meta description to target teeth whitening cost searches',
        'GSC shows 8400 impressions at position 6.4 with 0.7 percent CTR',
        'https://example.com/services/teeth-whitening','high',
        'Production remains separately gated.','',
        '2026-07-03T00:00:00Z','2026-07-03T00:00:00Z');
```

Set `status` to `needs_review` for anything waiting on you. When you approve
a card in the hosted dashboard, it queues a command that the bridge pulls
down and applies locally: it flips this row to `approved` and creates a
bounded `agent_tasks` row (see below). It does not publish, deploy, or change
anything in production on its own; `production_gate` and `requested_action`
should describe what the agent would do next, not do it for you.

## agent_tasks

**Screen:** Agent Tasks (list view) and Task Board (kanban view of the same
rows, grouped by `status`).

**Columns that matter:**
`id, client_id, title, priority, status, source, owner_profile, page_asset,
next_action, notes, created_at, updated_at`

**Example:**

```sql
INSERT INTO agent_tasks (id,client_id,title,priority,status,source,
                          owner_profile,page_asset,next_action,notes,
                          created_at,updated_at)
VALUES ('task_001','my-client','Run approved workflow: rewrite title tag',
        'high','ready','Dashboard approval','acme-dental',
        'https://example.com/services/teeth-whitening',
        'Draft the new title and meta, then queue for approval',
        'Created from a dashboard approval.',
        '2026-07-03T00:00:00Z','2026-07-03T00:00:00Z');
```

Task Board groups by `status`: use `ready`, `backlog`, or `blocked` for "To
Do", `running` for "In Progress", `waiting_for_approval` or
`needs_approval` for "Needs Approval", and `done` for "Done".

## managed_jobs

**Screen:** Schedule.

**Columns that matter:**
`id, client_id, name, job_type, cadence, next_run, last_run, status,
model_policy, data_sources, latest_result, managed_by`

**Example:**

```sql
INSERT INTO managed_jobs (id,client_id,name,job_type,cadence,next_run,
                           last_run,status,model_policy,data_sources,
                           latest_result,managed_by)
VALUES ('job_001','my-client','Weekly opportunity scoring','opportunity',
        'weekly','2026-07-10T09:00:00Z','2026-07-03T09:00:00Z','active',
        'cheap model for scoring','Google Search Console',
        'Found 6 new opportunities','hermes');
```

Set `status` to `failed` or `setup_needed` to surface the job on the
Command Center "Needs Your Attention Today" list as a broken job or a setup
prompt. `job_type` should be one of `data_refresh`, `reviews`, `opportunity`,
`content`, or `crawl` so the Schedule screen labels it correctly.

## activity_events

**Screen:** Activity Log (and it feeds "Last activity" per client on
Command Center's Client Health Summary).

**Columns that matter:**
`id, client_id, source, event_type, status, summary, next_action, artifact,
created_at`

**Example:**

```sql
INSERT INTO activity_events (id,client_id,source,event_type,status,summary,
                              next_action,artifact,created_at)
VALUES ('evt_001','my-client','hermes','opportunity_scored','done',
        'Scored 6 new opportunities from this weeks GSC pull',
        'Review the top opportunity in the dashboard','',
        '2026-07-03T00:00:00Z');
```

Write one event per meaningful outcome: a decision, a completed workflow, a
blocker, or a produced artifact. This is a log, not a chat transcript: do not
write one row per agent turn.

## artifacts

**Screen:** Activity Log currently surfaces artifacts by reference (its
description text is "decisions, approvals, completed work, blockers, and
artifacts"). The `artifacts` table itself is already synced to your hosted
dashboard and available over its API; a dedicated Artifacts screen is a
later milestone, so for now, treat writing here as making a record you can
query even though there is no standalone screen for it yet.

**Columns that matter:**
`id, client_id, title, artifact_type, status, summary, path_or_url,
updated_at`

**Example:**

```sql
INSERT INTO artifacts (id,client_id,title,artifact_type,status,summary,
                        path_or_url,updated_at)
VALUES ('artifact_001','my-client','Teeth whitening page audit','report',
        'ready','On-page and CTR audit for the teeth whitening service page',
        '/root/seo-sites/example.com/reports/teeth-whitening-audit.md',
        '2026-07-03T00:00:00Z');
```

Use `path_or_url` for a Google Doc link, a clean HTML report URL, or a local
workspace path. Do not put raw client data in `summary`; keep it to a
one-line description.

## Paste this into your client profile's SOUL/AGENTS file

Every client workspace `setup_seo_os.py` creates gets an `AGENTS.md` file.
Add a section like this so the agent knows to keep the dashboard current as
it works, not just produce reports on the side:

```markdown
## Dashboard bookkeeping (SEO OS)

This client is connected to a SEO OS dashboard. Keep it current as you work:

- When you find something worth doing (a content refresh, a technical fix, a
  CTR test candidate), write a row to `opportunities` in
  `/root/seo-os-dashboard/data/seo-os.sqlite` before you propose or do
  anything. Set `status` to `needs_review`.
- Before taking any production-impacting action (publishing, deploying,
  redirecting, changing canonicals or noindex, deleting, or outreach),
  write a row to `approval_requests` with `status='needs_review'` and a
  clear `requested_action`. Wait for it to be approved before proceeding.
  Approval happens in the hosted dashboard, not in this file.
- When you start or finish a bounded piece of work, write or update a row
  in `agent_tasks` so it shows up on the Task Board. Use `ready` when it is
  queued, `running` while you work on it, and `done` when finished.
- When something notable happens (a decision, a completed workflow, a
  blocker, a produced report), write one row to `activity_events`. This is
  a log for humans, not a transcript: one row per outcome, not per turn.
- If you produce a report, draft, or other deliverable, record it in
  `artifacts` with a `path_or_url` the operator can open.
- Never write secrets, API keys, or raw client PII into any of these
  tables. Summaries and links only.
```
