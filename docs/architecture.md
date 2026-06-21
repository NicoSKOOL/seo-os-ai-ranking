# SEO OS Architecture

SEO OS is a reusable Hermes-based operating system for SEO agency work.

## Components

```text
Telegram / CLI
  ↓
Hermes operator profile
  ↓ routes work to
Per-client Hermes profile
  ↓ reads/writes
Per-client VPS workspace
  ↓ summarizes into
SQLite operational state
  ↓ powers
Custom SEO OS dashboard
  ↓ produces
Google Docs / clean HTML reports / optional Sheet exports
```

## Roles

| Component | Role |
|---|---|
| Custom dashboard | Main human-readable operating board |
| SQLite | Local operational state for clients, jobs, approvals, tasks, reports, and activity |
| Hermes | Worker that refreshes data, drafts tasks, writes reports, and requests approval |
| Telegram | Operator notification and conversation layer |
| Hermes profile | Client-specific memory/context/tool routing |
| VPS workspace | Internal data, drafts, logs, reports, scripts, and client knowledge |
| Google Docs / HTML | Polished reports and client-facing deliverables |
| Google Sheets | Optional export layer only |

## Update model

- Daily refresh updates the operating picture.
- Work-time updates modify approvals, agent tasks, activity, CTR tests, review management, reports, and dashboard KPIs.
- Internal artifacts stay on the VPS unless they become user-reviewable deliverables.
- The dashboard should only display operational summaries and artifacts, not raw private credentials or full conversation logs.

## Client expertise layer

For content quality, SEO OS should gather client expertise by email/form, then distill it into `client-knowledge/`. This is what prevents generic AI SEO content.

## Review management layer

For local SEO, review monitoring can connect to GBP tooling, Zernio, or another review provider. Positive reviews can use approved response templates. Negative/risky reviews require approval before posting.
