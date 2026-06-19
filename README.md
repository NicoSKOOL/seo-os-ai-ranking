# SEO OS AI Ranking

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
git clone https://github.com/NicoSKOOL/seo-os-ai-ranking.git
cd seo-os-ai-ranking
python3 scripts/setup_seo_os.py \
  --client-name "Example Roofing" \
  --domain example.com \
  --client-type local-seo \
  --site-url https://example.com/ \
  --main-offer "Roof repair and replacement" \
  --target-audience "Homeowners in Austin" \
  --conversion-goal "Booked inspection calls" \
  --gsc-property sc-domain:example.com \
  --ga4-property 123456789 \
  --telegram-target telegram:-1001234567890:42 \
  --first-workflow "Low-CTR title/meta planning" \
  --content-delivery-mode google_doc \
  --cms wordpress \
  --generate-image-style-guide yes \
  --dry-run
```

Remove `--dry-run` when you are ready to create the workspace files.

See `docs/onboarding-sequence.md` for the recommended community onboarding flow.

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
  analytics-access.md
  marketing-boundaries.md
  onboarding-checklist.md
  content-writing-guidelines.md
  image-style-guide.md
  client-intake.md
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

## Content defaults

SEO OS includes default writing rules for community sites. These are structure and quality rules, not AI Ranking voice rules:

- TL;DR near the top
- search-intent answer in the opening
- content capsules for roughly 60 to 70 percent of most blog posts
- contextual internal links to relevant site sections/pages
- external source links on the claims they support
- FAQ section near the end when useful
- website-specific image style guide for consistent feature images

See:

- `docs/default-content-and-image-guidelines.md`
- `docs/content-writing-and-publishing.md`

## Community distribution

The recommended distribution model is a GitHub starter kit:

- users clone or fork the repo
- updates ship through commits and releases
- community issues become product feedback
- stable workflows move into scripts, templates, and the `seo-os` skill

Use releases for stable milestones. Keep risky or experimental workflows behind clear setup flags until proven.

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

This starter kit was extracted from a working SEO OS prototype. It is expected to evolve. Add new workflows as separate scripts/templates first, then promote stable workflows into the `seo-os` skill and setup wizard.
