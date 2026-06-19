# SEO OS client onboarding sequence

This is the recommended onboarding flow for a community-shareable SEO OS starter kit.

## Core principle

A Telegram topic and website URL are enough to start the conversation, but not enough to operate safely.

A reliable SEO OS client needs:

- a client registry row
- an explicit Telegram chat/thread binding
- a site-specific workspace
- a site-specific Hermes profile, where possible
- verified GSC and GA4 property mapping
- a clear approval policy
- business, offer, audience, and conversion context
- one safe first workflow

## Recommended first message from the operator

Use this in the new Telegram topic or CLI session:

```text
New SEO OS client setup

Client name:
Website URL:
Business type:
Main offer:
Target audience/location:
Primary conversion goal:
GSC property:
GA4 property:
Competitors:
Approval policy:
CMS/platform:
Content delivery mode:
Generate image style guide? yes/no
Repo/hosting access:
Staging URL:
Reviews/Zernio/GBP:
Notes:
```

If the operator only provides the website URL, SEO OS should create a setup draft but mark the client as `setup_needed` until the required fields are complete.

## Onboarding stages

### Stage 1: Capture

Collect the minimum client facts:

| Field | Required | Notes |
|---|---:|---|
| Client name | yes | Human-readable name |
| Domain/site URL | yes | Canonical public site |
| Business type | yes | Local SEO, SaaS, agency, content site, ecommerce, etc. |
| Main offer | yes | What the site sells or converts for |
| Target audience/location | yes | Needed for SERP intent and content relevance |
| Primary conversion goal | yes | Calls, bookings, trials, paid signups, leads, purchases |
| GSC property | yes for real SEO | URL-prefix or domain property |
| GA4 property | recommended | Needed for landing-page quality and conversions |
| Telegram topic target | yes | Must be explicit `telegram:<chat_id>:<thread_id>` |
| Approval policy | yes | Defines what can happen without approval |
| CMS/platform | recommended | Astro/Cloudflare, WordPress, Webflow, Shopify, Wix, custom, etc. |
| Content delivery mode | yes | Default to `google_doc` unless repo/CMS automation is intentionally connected |
| Image style guide | optional but recommended | Create a website-specific visual guide so future feature images are consistent |
| Competitors | recommended | Useful after first baseline |
| Repo/hosting | optional | Required only for code/content changes or staging previews |
| Staging URL | optional | Required for Git/static-site staging workflows |
| Zernio/GBP | optional | For local SEO review workflows |

### Stage 2: Create local system records

Create or update:

```text
/root/seo-sites/<domain>/
  AGENTS.md
  site-profile.md
  approval-policy.md
  analytics-access.md
  marketing-boundaries.md
  onboarding-checklist.md
  content-writing-guidelines.md
  image-style-guide.md
  client-config.json
  client-knowledge/
  data/
  reports/
  drafts/
  plans/
  logs/
  repo/
```

Create or update the SEO OS registry:

```text
clients.yaml or SQLite clients table
telegram_bindings table or config section
approval policy row
managed jobs rows, initially disabled or setup_needed
```

### Stage 3: Verify routing

Topic names are not enough. Verify the actual topic binding.

1. Send an outbound test message to `telegram:<chat_id>:<thread_id>`.
2. Operator confirms it appears in the intended topic.
3. Operator sends a normal standalone message in that same topic.
4. Confirm Hermes receives the inbound message with the same thread ID.
5. Save the verified target and timestamp.

If inbound does not work, check:

- Telegram allowed chats
- free response chats
- `require_mention: false` for the trusted group
- BotFather privacy mode
- bot permissions in the group/topic

### Stage 4: Verify data access

Run read-only checks only:

- GSC property can be queried
- GA4 property can be queried, if provided
- sitemap URL is reachable
- robots.txt is reachable
- homepage and top pages can be fetched
- repo/hosting boundaries are documented, if provided
- content delivery mode is documented, defaulting to Google Doc drafts when no safe publishing integration exists
- content writing guidelines are created with TL;DR, content capsules, internal links, contextual sources, and FAQ requirements
- image style guide is created or explicitly skipped

Do not create content, push branches, publish, redirect, noindex, canonicalize, delete, or send outreach during onboarding verification.

### Stage 5: Generate baseline

Create a short baseline report:

- current indexed/public pages from sitemap
- GSC 28-day page/query snapshot
- GA4 landing-page snapshot, if available
- obvious technical blockers
- top 3 to 5 opportunities
- recommended first safe workflow

### Stage 6: Ask for first approval

The first approval should be bounded and low risk. Recommended options:

1. Low-CTR title/meta planning for high-impression pages.
2. SERP gap analysis for one existing page.
3. Indexing recovery plan for pages that deserve indexing.
4. Internal-link suggestions only.
5. Google Doc content draft for one approved topic.

Content writing default:

- Use Google Docs drafts for community users by default.
- Use Astro/Cloudflare staging only when repo, staging, build, and deploy boundaries are verified.
- Use WordPress draft creation only when the user deliberately connects WordPress MCP/API access.

See `docs/content-writing-and-publishing.md` for the full publishing-mode policy.

Approval copy should be explicit:

```text
Approve this planning/staging task only?

This allows Hermes to create a bounded task and draft recommendations.
It does not allow publishing, deploying, redirects, noindex/canonical changes, deletions, or outreach.
```

### Stage 7: Execute through approvals

When the dashboard approval button is clicked:

```text
Dashboard decision
  -> update approval_requests.status
  -> log activity_events
  -> create/update agent_tasks row
  -> send Telegram confirmation to the bound topic
  -> worker/dispatcher picks up ready task with the correct profile
```

The confirmation should tell the user:

- what they approved
- what Hermes will do next
- what is still gated
- whether anything else is needed from them

## Community packaging recommendation

Share SEO OS as a GitHub starter kit, not as a one-off file dump.

Why GitHub is better:

- users can clone or fork it
- updates can be pulled with `git pull`
- issues can collect community bugs and feature requests
- releases can mark stable versions
- setup docs can evolve with the product
- scripts, templates, skills, dashboard, and examples stay together

Recommended repo shape:

```text
seo-os/
  README.md
  CHANGELOG.md
  LICENSE
  docs/
    onboarding-sequence.md
    architecture.md
    approvals-and-safety.md
    google-sheet-setup.md
    dashboard-setup.md
    content-writing-and-publishing.md
    default-content-and-image-guidelines.md
    troubleshooting.md
  scripts/
    setup_seo_os.py
    verify_client_setup.py
    refresh_gsc.py
  templates/
    client-knowledge/
    onboarding/
    google-sheet/
  dashboard/
    server.py
    static/
  skills/
    seo-os/SKILL.md
  examples/
    local-seo-client.json
    saas-client.json
```

Use GitHub releases for community updates:

- `v0.1`: docs, templates, setup script, Google Sheet template
- `v0.2`: local dashboard and approval API
- `v0.3`: client onboarding wizard and verification script
- `v0.4`: ready-task dispatcher
- `v0.5`: GSC/GA4 refresh workflows

## Do not promise

Avoid claiming:

- fully autonomous SEO
- guaranteed rankings
- no human input required
- safe automatic publishing

Better framing:

> SEO OS helps you connect your SEO data, find opportunities, draft improvements, and route work through human approval.
