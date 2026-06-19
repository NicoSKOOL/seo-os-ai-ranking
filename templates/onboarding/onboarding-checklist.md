# Onboarding Checklist

Client: {{client_name}}
Domain: {{domain}}
Workspace: {{workspace}}
Hermes profile: {{profile}}
Created: {{created_at}}

## 1. Client facts

- [ ] Client name confirmed
- [ ] Website URL confirmed
- [ ] Business type confirmed
- [ ] Main offer documented
- [ ] Target audience/location documented
- [ ] Primary conversion goal documented
- [ ] Competitors added, if available

## 2. Routing

- [ ] Telegram target recorded
- [ ] Outbound test sent to the intended topic
- [ ] Operator confirmed visible topic name
- [ ] Inbound standalone topic message received
- [ ] Binding saved with chat_id and thread_id

## 3. Data access

- [ ] GSC property recorded
- [ ] GSC read-only query verified
- [ ] GA4 property recorded, if available
- [ ] GA4 read-only query verified, if available
- [ ] Sitemap reachable
- [ ] Robots.txt reachable
- [ ] Homepage fetch works

## 4. Workspace and profile

- [ ] Workspace created
- [ ] AGENTS.md created
- [ ] site-profile.md created
- [ ] approval-policy.md created
- [ ] analytics-access.md created
- [ ] marketing-boundaries.md created
- [ ] content-writing-guidelines.md created
- [ ] image-style-guide.md created or explicitly skipped
- [ ] client-config.json created
- [ ] Hermes profile created, if using profile isolation
- [ ] Profile launch/cwd smoke test passed
- [ ] CMS/platform documented
- [ ] Content delivery mode selected: {{content_delivery_mode}}
- [ ] Staging/preview URL verified, if using Astro/Cloudflare staging
- [ ] WordPress MCP/API deliberately connected and verified, if using WordPress draft mode
- [ ] Publish approver documented

## 5. Safety

- [ ] Approval policy reviewed
- [ ] Publishing is gated
- [ ] Deploys are gated
- [ ] Redirects are gated
- [ ] Canonical/noindex changes are gated
- [ ] Deletions are gated
- [ ] External outreach is gated
- [ ] Client emails are draft-only in v1
- [ ] Google Doc mode creates drafts only, no CMS writes
- [ ] Astro/Cloudflare mode creates staging previews only until production approval
- [ ] WordPress mode creates drafts only until publish approval
- [ ] TL;DR required near the top of most blog drafts
- [ ] Content capsules used for roughly 60 to 70 percent of most blog drafts
- [ ] FAQ section included when the topic supports it
- [ ] Internal link plan included
- [ ] External sources linked contextually on supported claims

## 6. First workflow

Recommended first workflow:
{{first_workflow}}

- [ ] Baseline data collected
- [ ] First opportunity selected
- [ ] Approval request created
- [ ] Dashboard approval tested
- [ ] Telegram confirmation sent to correct topic
- [ ] Ready task assigned to correct profile
