# SEO OS AI Ranking

A reusable starter kit for running an SEO operating system with Hermes Agent and a VPS-local custom dashboard.

SEO OS gives an agency owner or business owner a structured way to run SEO work with:

- a custom SEO OS Command Center dashboard
- local SQLite operational state
- per-client Hermes profiles
- per-client VPS workspaces
- scheduled SEO checks and reports
- approval-gated agent work
- CTR tests
- review management workflows
- content and client expertise intake
- reusable client knowledge libraries

This repo is intentionally a template. It ships with fake demo data only. Do not commit client data, API tokens, private Telegram IDs, Search Console exports, analytics exports, SQLite databases, logs, generated reports, or local workspace files.

## Mental model

```text
Custom SEO OS Dashboard = operating board
SQLite = local template/demo state
Hermes = worker
Telegram = operator notification layer
Hermes profiles = client separation
VPS file system = internal workspace and data store
Google Docs / clean HTML = polished reports and client-facing deliverables
Google Sheets = optional export layer, not the primary dashboard
```

## Quick start

```bash
git clone https://github.com/NicoSKOOL/seo-os-ai-ranking.git
cd seo-os-ai-ranking
python3 server.py --host 127.0.0.1 --port 8787 --reset
```

Then open:

```text
http://127.0.0.1:8787
```

If this is running on a VPS, use an SSH tunnel or a protected reverse proxy. Do not expose the dashboard publicly without authentication.

## What v1 includes

- Command Center
- Clients / Sites
- Approvals
- Opportunities
- Agent Tasks
- Content pipeline
- Schedule
- CTR Tests
- Activity Log
- Reports
- Settings / Routing

## Template data policy

The dashboard seeds fake clients and fake metrics on first run. The seed data exists only to demonstrate the workflow and UI.

Never commit:

- `data/` SQLite databases, WAL files, raw exports, or performance snapshots
- `logs/` files
- `generated/` plans or reports
- real client workspace paths
- private Telegram chat IDs or thread IDs
- Search Console, GA4, Google Workspace, Cloudflare, Zernio, or email credentials
- real customer/client names unless they are intentionally public demo examples

## Client workspace setup

The setup wizard can create a local workspace skeleton for a new client:

```bash
python3 scripts/setup_seo_os.py \
  --client-name "Example Roofing" \
  --domain example.com \
  --client-type local-seo \
  --site-url https://example.com/ \
  --main-offer "Roof repair and replacement" \
  --target-audience "Homeowners in Austin" \
  --conversion-goal "Booked inspection calls" \
  --content-delivery-mode google_doc \
  --cms wordpress \
  --dry-run
```

Remove `--dry-run` only when you are ready to create local workspace files.

## Product architecture direction

SEO OS should own scheduling, approvals, work tracking, and reporting inside the custom dashboard. A Sheet can be added later as a clean export or public-friendly view, but it should not be treated as the main operating system.

Recommended member setup:

1. Connect GSC.
2. Connect GA4.
3. Connect review source, such as a GBP/review provider.
4. SEO OS creates/owns managed jobs for refreshes, opportunity scoring, and review monitoring.

Model policy:

- No model for raw API pulls and normalization.
- Cheap model for labeling, lightweight summaries, review-response drafts, and opportunity explanations.
- Stronger model only for strategic plans, SERP synthesis, and approved content/change recommendations.

## Safety defaults

Dashboard approvals update state and create bounded tasks. They do not publish, deploy, redirect, noindex, canonicalize, delete pages, or send outreach. Those actions need separate explicit approval.
