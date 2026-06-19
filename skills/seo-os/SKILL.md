---
name: seo-os
description: "Use when setting up, operating, or extending SEO OS: a Hermes-powered SEO agency operating system using Google Sheets, per-client profiles, VPS workspaces, approval workflows, CTR tests, content expertise intake, and review management."
version: 0.1.0
author: AI Ranking / Hermes Agent
license: MIT
metadata:
  hermes:
    tags: [seo, agency, google-sheets, search-console, approvals, content, local-seo]
    related_skills: [hermes-agent, productivity-document-workflows, datawise-marketing-seo-operations]
---

# SEO OS

## Overview

SEO OS is a Hermes-powered operating system for SEO work. It combines a human-readable Google Sheet, per-client Hermes profiles, VPS workspaces, scheduled jobs, approval workflows, and report/document generation.

Use this skill when helping a user set up, operate, or extend the SEO OS starter kit.

Core mental model:

```text
Google Sheet = operating board
Hermes = worker
Telegram = operator notification layer
Hermes profiles = client separation
VPS file system = internal workspace and data store
Google Docs = polished reports and client-facing deliverables
```

## When to Use

Use this skill when the task involves:

- creating or updating the SEO OS Google Sheet
- adding a new SEO client/site
- creating a per-client Hermes profile or workspace
- planning daily/weekly SEO automation
- approval-gated SEO work
- CTR tests
- review management for local SEO
- client expertise intake
- building a client knowledge library
- generating SEO reports or client updates

Do not use this for generic SEO advice without any SEO OS workflow, Sheet, client profile, or automation context.

## Google Sheet Principles

Visible tabs should be human-readable and useful to an agency owner or business owner.

Avoid in user-facing tabs:

- raw job IDs
- raw client IDs
- local VPS paths
- workdirs
- scripts
- skill names
- raw cron output paths
- excessive artifact inventory

Prefer:

- client names, color-coded
- plain-English job descriptions
- readable dates
- same-window metrics
- one filter only where useful
- concise top-level summaries
- approval/status dropdowns only where they create action

## Default Tabs

- `Control Center`: what needs attention now.
- `Clients`: one row per client/site and routing details.
- `Agent Responsibilities`: plain-English list of what agents own.
- `Schedule`: recurring jobs and what they do.
- `Activity Log`: important outcomes only, not a transcript.
- `Approvals`: approval queue.
- `SEO Opportunities`: potential work from data and analysis.
- `CTR Tests`: title/meta tests from baseline to report.
- `Review Management`: local SEO review monitoring and response workflow.
- `Agent Tasks`: execution queue.
- `Telegram Routing`: operator notification routing.
- `Performance Snapshot`: same-window SEO metrics.
- `Content & Expertise`: content plan plus client SME input workflow.

## Client Workspace Layout

Create a separate workspace per client:

```text
/root/seo-sites/<domain>/
  data/
  reports/
  drafts/
  logs/
  plans/
  repo/
  client-knowledge/
  site-profile.md
  approval-policy.md
  AGENTS.md
  client-config.json
```

Keep raw/internal artifacts in the workspace. Show users links only when they are reviewable or actionable.

## Profile Separation

Each client should have a separate Hermes profile where possible:

```bash
hermes profile create <client-slug>-seo --clone default
```

Profiles should separate memory, context, credentials, and routing.

## Daily Operating Rhythm

1. Daily refresh updates the Google Sheet from current data.
2. Schedule checks update after cron jobs run.
3. New approvals/tasks are added as work happens.
4. The Activity Log records important outcomes only.
5. Telegram receives concise summaries only when attention is needed.

Use script-only jobs for simple checks. Use cheap models for short summaries. Use stronger models for strategy and nuanced recommendations.

## Approval Rules

Require explicit approval before:

- publishing content
- deploying changes
- redirect/canonical/noindex changes
- deleting pages
- external outreach
- sending client emails in v1
- posting negative or risky review responses

For approval dropdowns, safe v1 behavior is:

```text
status changed -> log decision -> update task -> notify operator
```

Do not make dropdowns directly execute risky production work until the workflow is proven.

## CTR Testing Workflow

1. Hermes finds high-impression / low-CTR opportunity.
2. Hermes asks operator whether to start a CTR test.
3. Approved test locks starting metrics in `CTR Tests`.
4. Hermes monitors until enough data exists.
5. Hermes creates a Google Doc report.
6. Hermes recommends the next change.

## Client Expertise Intake Workflow

Do not give clients direct Hermes or Telegram access. Use email or a simple form.

Flow:

```text
content plan -> approved topics -> SME questions -> agency approval -> client email/form -> answer processing -> knowledge library -> content briefs/drafts
```

Distill client answers into `client-knowledge/`:

- customer objections
- common questions
- stories and examples
- pricing/process nuance
- competitor differences
- claims to avoid
- voice/style notes
- reusable FAQs
- proof/assets

## Review Management Workflow

For local SEO clients, reviews can be monitored through Zernio or another GBP/review integration.

Positive reviews:

- acknowledge the review
- thank the customer
- mention service/outcome naturally if safe
- invite them to return/contact again
- can use approved templates once style is approved

Negative reviews:

- draft only
- acknowledge the experience
- thank them for feedback
- ask them to contact the owner/business directly to rectify the issue
- do not argue, blame, admit fault, or reveal private details
- require approval before posting

## Verification Checklist

- [ ] User-facing tabs avoid raw IDs and VPS paths.
- [ ] Metrics use the same date window before comparing clients.
- [ ] Risky actions are approval-gated.
- [ ] Client workspaces are separated.
- [ ] Client knowledge is distilled for reuse.
- [ ] Simple checks use scripts or cheap models.
