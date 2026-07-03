# SEO OS Dashboard: Reviews screen with drafted replies (mock-data milestone)

Date: 2026-07-03
Status: Approved design. Ready for implementation plan.
Owner: Nico (AI Ranking)

## Goal

Ship the Reviews screen as a real, working dashboard view so the community
launch can show review management: per selected client, the reviews with
ratings, theme clusters, the response rate, and, for every unresponded
review, a drafted reply waiting for approval. This milestone renders the
screen from demo seed data. The agent-side pipeline that fills it with real
Google Business Profile data (via postproxy.dev on the member's VPS) is a
later milestone; nothing in this design blocks it.

## Decisions locked in this design

- Real screen + mock rows: the production `viewReviews()` is rewritten and
  fed by demo seed rows. No throwaway mockup, no bridge work yet.
- Approving a drafted reply happens BOTH inline on the Reviews screen and in
  the existing Approvals inbox. One underlying `approval_requests` row of a
  new type `review_reply`; either surface approves it.
- Every drafted reply requires operator approval regardless of rating. No
  auto-posting in the product at launch. Members who later instruct their
  agent to auto-post positives will simply see those reviews arrive as
  `replied`.
- Theme clusters are display-side aggregation of per-review tags. The agent
  writes the tags; the dashboard only counts and colors them. No themes
  table.

## 1. Data model (hosted D1 only)

New additive migration `dashboard/migrations/0002_reviews.sql`, following
the existing table conventions (TEXT ids, account scoping, ISO timestamps):

```sql
CREATE TABLE IF NOT EXISTS reviews (
  id            TEXT PRIMARY KEY,            -- rev_<slug or hash>
  account_id    TEXT NOT NULL,
  client_id     TEXT NOT NULL,
  source        TEXT NOT NULL DEFAULT 'google',
  reviewer      TEXT NOT NULL,               -- display name only
  rating        INTEGER NOT NULL,            -- 1..5
  text          TEXT NOT NULL DEFAULT '',
  themes        TEXT NOT NULL DEFAULT '',    -- comma-separated tags, agent-written
  published_at  TEXT NOT NULL,               -- when the review appeared on GBP
  reply_status  TEXT NOT NULL DEFAULT 'needs_reply',
                -- needs_reply | draft_ready | replied
  reply_text    TEXT NOT NULL DEFAULT '',    -- posted reply, or the draft when draft_ready
  replied_at    TEXT,                        -- set only when replied
  approval_id   TEXT,                        -- approval_requests.id when draft_ready
  created_at    TEXT NOT NULL,
  updated_at    TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_reviews_account ON reviews(account_id, client_id);
```

House rule unchanged: additive only. The VPS local schema
(`dashboard/db/local-schema.sql`) is NOT touched in this milestone.

## 2. Worker API changes

- The summary payload the SPA already loads gains `reviews`: all rows for
  the session's account, same account-scoping pattern as approvals and
  opportunities. No new endpoint.
- `POST /api/approvals/:id/decision` must accept type `review_reply` through
  whatever type policy it applies today. Approve enqueues the same bounded
  command as any approval; without a connected VPS the command sits
  unclaimed, which matches all demo data behavior. On approve, the Worker
  also flips the linked review row (matched by `approval_id`) from
  `draft_ready` to `replied` with `replied_at` set and `reply_text` kept, so
  the screen reflects the decision immediately. If the implementation finds
  the decision endpoint fully type-agnostic already, only the review-row
  flip is new.
- Honest simplification, on purpose: flipping to `replied` at approval time
  means the dashboard shows the reply as posted before any agent actually
  posts it. That is correct for this demo milestone (no VPS ever claims the
  command). The wire-it-live milestone may split this into a distinct
  queued state driven by command completion; the column values chosen here
  do not block that.

Rejection or request-changes on a `review_reply` card behaves like any other
approval (status flips, no command); the review row returns to
`needs_reply` and clears `approval_id` so the agent can draft again later.

## 3. UI: `viewReviews()` rewrite in `dashboard/public/app.js`

Respects the existing client selector (`state.client`), like every screen.
When All Clients is selected, KPIs aggregate across clients and each feed
card shows the client name chip, matching existing list conventions.

Layout, top to bottom:

1. **KPI row** (existing `kpiCard` component): average rating with stars,
   total reviews, response rate percent (replied / total), needs-reply
   count (amber when nonzero). The last card in the same row is a compact
   5-to-1 rating distribution (five horizontal bars with counts).
2. **Themes customers mention**: chips aggregated from `themes` tags. Each
   chip shows tag, review count, and that tag's average rating; chip tone by
   average rating (green at 4.0 or above, amber 3.0 to 3.9, red below 3.0).
   Sorted by count descending. Clicking a chip filters the feed to that
   theme (client-side state only); clicking again clears the filter.
3. **Review feed**: newest first. Each card shows reviewer, star rating,
   relative date, review text, small theme tags, and a status badge
   (`Replied` green, `Draft ready` amber, `Needs reply` amber). Replied
   cards show the posted reply in a collapsed, muted block ("Your reply").
   Cards with `draft_ready` show a highlighted draft block titled "Hermes
   drafted this reply" with the draft text and two buttons: **Approve**
   (primary; calls the decision endpoint for `approval_id`, then refreshes
   data; card flips to "Approved, queued for Hermes" state) and **Edit**
   (opens the existing approval card in the Approvals view for this row,
   where request-changes lives; no new editor is built in this milestone).
   Cards with `needs_reply` and no draft show a muted "Hermes will draft a
   reply on its next pass" note.
4. **Empty state**: a client with no review rows keeps a lead card similar
   to today's placeholder, explaining that reviews activate when the
   client's agent is connected to a Google Business Profile (postproxy.dev)
   and pointing at HERMES-INTEGRATION.md. The current explainer content
   ("how Hermes handles reviews") stays below the empty state, updated to
   say every reply waits for approval (the auto-post wording is removed).

The Approvals inbox needs no layout change: `review_reply` rows render as
normal approval cards (title = "Reply to <reviewer> (<rating> stars) -
<client>", evidence = the review text, proposal = the draft).

## 4. Demo seed data

`dashboard/src/db/seed-demo.sql` gains about 14 reviews across the existing
demo clients, all `acct_demo`, plus 4 matching `approval_requests` rows
(type `review_reply`, status `needs_review`):

- Ratings mixed to read realistically: mostly 5s and 4s, a few 3s, two 1-2
  star.
- Around 70 percent already `replied` (with plausible posted replies and
  `replied_at`), so the response rate KPI shows a credible number.
- 4 unresponded: 3 `draft_ready` with drafted replies and linked approvals,
  including one angry 1-star with a careful, non-defensive draft (the
  community screenshot moment), and 1 plain `needs_reply` to show the
  "agent will draft on its next pass" state.
- Recurring theme tags so clusters are visible (for example: friendly
  staff, pricing, wait times, results, communication), with wait times
  skewing low-rated so a red chip appears.
- All names, businesses, and content generic and invented. No real client
  data.

## 5. Verification

- Fresh local D1 (`npm run db:local` picks up 0002) + `npm run db:seed`,
  `wrangler dev`, walk the screen in a real browser as the demo account:
  KPIs, distribution, theme chips (including the red one and chip
  filtering), replied cards, draft cards, empty state on a client without
  reviews.
- Approve one draft inline end to end on local dev: decision endpoint 200,
  approval flips, review row flips to replied, response-rate KPI updates
  after refresh, and the same card is gone from the Approvals inbox.
- Confirm the same draft appeared in the Approvals inbox before approving.
- `npx tsc --noEmit`, `node --check app.js`, full pytest suite (drift tests
  unaffected), and the Task 3 style check that a fresh db builds 0001+0002
  cleanly.

## Out of scope (later "wire it live" milestone)

- VPS local schema table, SYNC_COLUMNS, bridge ingest for reviews.
- HERMES-INTEGRATION.md section for reviews and the postproxy.dev
  connection guide (https://postproxy.dev/reference/platforms/google-business/).
- Actually posting approved replies via postproxy (agent-side execute).
- A draft editor UI (Edit routes to the existing approval card for now).
- Auto-posting policies of any kind.
