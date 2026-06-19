# SEO OS Architecture

SEO OS is a reusable Hermes-based operating system for SEO agency work.

## Components

```text
Telegram / CLI
  ↓
Hermes default/operator profile
  ↓ routes work to
Per-client Hermes profile
  ↓ reads/writes
Per-client VPS workspace
  ↓ summarizes into
Google Sheet control center
  ↓ produces
Google Docs / clean HTML reports
```

## Roles

| Component | Role |
|---|---|
| Google Sheet | Human-readable operating board |
| Hermes | Worker that refreshes data, drafts tasks, writes reports, and requests approval |
| Telegram | Operator notification and conversation layer |
| Hermes profile | Client-specific memory/context/tool routing |
| VPS workspace | Internal data, drafts, logs, reports, scripts, and client knowledge |
| Google Docs | Polished reports and client-facing deliverables |

## Update model

- Daily refresh updates the operating picture.
- Work-time updates modify Approvals, Agent Tasks, Activity Log, CTR Tests, Review Management, and Control Center as things happen.
- Internal artifacts stay on the VPS unless they become user-reviewable deliverables.

## Client expertise layer

For content quality, SEO OS should gather client expertise by email/form, then distill it into `client-knowledge/`. This is what prevents generic AI SEO content.

## Review management layer

For local SEO, review monitoring can connect to Zernio or another GBP/review provider. Positive reviews can use approved response templates. Negative/risky reviews require approval before posting.
