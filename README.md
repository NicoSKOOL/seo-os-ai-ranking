# SEO OS for Hermes

A reusable starter kit for building an SEO operating system on top of Hermes Agent.

SEO OS gives an agency owner or business owner a structured way to run SEO work with:

- a Google Sheet control center
- per-client Hermes profiles
- per-client VPS workspaces
- scheduled SEO checks and reports
- approval-gated agent work
- CTR tests
- review management workflows
- content and client expertise intake
- reusable client knowledge libraries

This repo is intentionally a starter kit, not a finished SaaS product. Keep improving the workflows as real use exposes better patterns.

## Mental model

```text
Google Sheet = operating board
Hermes = worker
Telegram = operator notification layer
Hermes profiles = client separation
VPS file system = internal workspace and data store
Google Docs = polished reports and client-facing deliverables
```

## Quick start

```bash
cd /root/seo-os-template
python3 scripts/setup_seo_os.py --client-name "Example Roofing" --domain example.com --client-type local-seo --dry-run
```

Remove `--dry-run` when you are ready to create the workspace files.

## What gets created

For a client such as `example.com`, the setup creates:

```text
/root/seo-sites/example.com/
  data/
  reports/
  drafts/
  logs/
  plans/
  repo/
  client-knowledge/
    customer-objections.md
    common-questions.md
    stories-and-examples.md
    pricing-and-process.md
    competitor-differences.md
    claims-to-avoid.md
    voice-and-style.md
    reusable-faqs.md
    proof-and-assets.md
  site-profile.md
  approval-policy.md
  AGENTS.md
  client-config.json
```

The Google Sheet template should include these user-facing tabs:

```text
Control Center
Clients
Agent Responsibilities
Schedule
Activity Log
Approvals
SEO Opportunities
CTR Tests
Review Management
Agent Tasks
Telegram Routing
Performance Snapshot
Content & Expertise
```

## Phased setup

### Tier 1: Demo/template

Use demo data and the Google Sheet template to understand the operating system.

### Tier 2: Real website SEO

Connect Google Search Console, Google Sheets, Google Docs, and Telegram notifications.

### Tier 3: Agency/local SEO

Add GA4, Cloudflare, Gmail, Zernio/GBP review monitoring, weekly client reporting, and client expertise intake.

## Cost strategy

Use deterministic scripts or cheap models for simple checks:

- Sheet refreshes
- dropdown/status change detection
- date formatting
- schedule status checks
- GSC metric pulls

Reserve stronger models for:

- SEO strategy
- content strategy
- competitor/content analysis
- client-specific recommendations
- nuanced report writing

## Safety defaults

Approval is required before:

- publishing content
- deploying changes
- redirects
- canonical/noindex changes
- deletions
- external outreach
- negative review responses
- client-facing emails in v1

## Current status

This starter kit was extracted from Nico's working SEO OS prototype. It is expected to evolve. Add new workflows as separate scripts/templates first, then promote stable workflows into the `seo-os` skill and setup wizard.
