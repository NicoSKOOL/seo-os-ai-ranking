# SEO OS Dashboard: Deploy-to-Cloudflare community distribution

Date: 2026-07-02
Status: Approved design. Ready for implementation plan.
Owner: Nico (AI Ranking)

Supersedes the "Side A" (laptop `setup.sh`) portion of
`2026-07-01-self-install-package-design.md`. The "Side B" VPS installer, the
update-safety rules (additive migrations, config isolation), the
`HERMES-INTEGRATION.md` conventions doc, and the drift-guard test from that spec
are retained and referenced here. The prerequisite fix from that spec (refresh
`dashboard/public/seo_os_sync.py`, serve `acp_chat.py`) already shipped in
commit `8f37b9b`.

## Goal

Let a community member who runs Hermes on a VPS stand up their OWN SEO OS
dashboard (their Cloudflare account, their Worker, their D1, their data) with:

1. One click on a "Deploy to Cloudflare" button in the public repo README.
2. A first-boot setup wizard in the browser (create login, get agent token).
3. One pasted command on their VPS.

No Node, no wrangler, no terminal on their laptop. Updates ship when Nico
pushes to the upstream repo and the member (or an automation they trigger)
syncs; nothing updates behind anyone's back.

## Decisions locked in this design

- Distribution model: Deploy-to-Cloudflare button (member-owned deployment).
  Hosted multi-tenant was considered and deferred; GitHub Pages was ruled out
  (static hosting cannot run the Worker, D1, auth, or the command queue).
- The repo stays PUBLIC (required by the deploy button). The paid value is the
  community: setup help, the seo-os Hermes skill, templates, and support.
- Updates are MANUAL-ONLY. No scheduled auto-sync. The member clicks "Run
  workflow" on a bundled GitHub Action when Nico announces an update.

## Member experience

```
1. Create a free Cloudflare account (and a GitHub account if needed).
2. Click [Deploy to Cloudflare] in the repo README.
   -> Cloudflare clones the repo into the member's GitHub account,
      auto-provisions THEIR OWN D1 + KV + R2, builds, and deploys.
3. Open the new workers.dev URL.
   -> First-boot wizard: create email + password, agent token shown ONCE,
      then the exact one-line VPS command is displayed.
4. Paste that one command on the VPS.
   -> Bridge installed (systemd), local SQLite created, clients registered
      interactively, first push runs, clients appear in the dashboard.
```

## Architecture changes

### 1. Tracked `wrangler.jsonc` becomes the member template

- The committed `dashboard/wrangler.jsonc` carries binding names but NO
  database/KV IDs, so the deploy flow auto-provisions fresh resources for each
  member (per Cloudflare deploy-button provisioning).
- Nico's real config moves to `dashboard/wrangler.local.jsonc`, git-ignored.
  Nico deploys with `npx wrangler deploy -c wrangler.local.jsonc`. His IDs
  leave git history going forward (they are non-secret, so no rotation needed).
- `wrangler.example.jsonc` from the July 1 spec is no longer needed; the
  tracked `wrangler.jsonc` IS the template.

### 2. First-boot setup wizard (replaces laptop `setup.sh`)

- On any request, the Worker checks whether `accounts` has zero rows (cheap
  COUNT, cacheable in-memory per isolate). If zero, all routes serve the setup
  page instead of the login.
- Setup page: operator email + password (twice). On submit the Worker:
  - generates a random agent token, stores only its sha256 in a new
    `accounts` row (`plan = 'self_install'`),
  - stores the PBKDF2 password hash in `account_members`,
  - shows the token ONCE with a copy button and the one-line VPS command
    (`curl -fsSL https://<their-worker>.workers.dev/install-vps.sh | bash`),
    pre-filled with their URL.
- Endpoint `POST /api/setup` only works while `accounts` is empty; afterwards
  it returns 403. Re-provisioning (fresh D1) naturally re-opens setup.
- Accepted small risk: a stranger could claim a fresh URL in the window
  between deploy and first visit. Documented; remedy is redeploy with a fresh
  database. No setup-code mechanism in v1.

### 3. `COOKIE_SECRET` self-provisioning

- Lookup order: `env.COOKIE_SECRET` (Worker secret, Nico keeps his) else a
  KV-stored value `cookie_secret` generated on first use (crypto-random,
  written once). Removes the only manual secret from the member flow.
- Consequence: for KV-backed members, deleting the KV namespace logs everyone
  out. Acceptable.

### 4. D1 migrations become the schema channel

- Convert `src/db/schema.sql` + `src/db/migrations/*` into Wrangler's native
  migrations convention (`dashboard/migrations/0001_init.sql`,
  `0002_account_password.sql`, `0003_chat_messages.sql`, ...). `0001_init`
  must be a faithful merge of the current schema so a FRESH database and
  Nico's EXISTING database end up identical.
- `package.json` deploy script:
  `"deploy": "wrangler d1 migrations apply DB --remote && wrangler deploy"`
  (binding name, not database name, per Cloudflare guidance). Cloudflare's
  Workers Builds runs this on every push to the member's repo, so schema
  changes ship themselves exactly once each (tracked in `d1_migrations`).
- Nico's path applies the same migrations with `-c wrangler.local.jsonc`.
  Bootstrapping his existing db: insert the already-applied migration names
  into `d1_migrations` manually once (documented in the plan), so `0001_init`
  is not re-run against live data.
- HOUSE RULE (unchanged from July 1 spec): migrations are additive only
  (CREATE TABLE IF NOT EXISTS, ALTER TABLE ADD COLUMN). Never destructive.

### 5. Manual update channel

- `.github/workflows/seo-os-update.yml` ships in the repo (so every member's
  clone has it). Trigger: `workflow_dispatch` ONLY (no cron; updates are
  manual by decision).
- The workflow: checkout, add upstream remote (Nico's repo URL baked in),
  `git fetch upstream`, `git merge --ff-only upstream/main`, push.
  `permissions: contents: write` so the default GITHUB_TOKEN can push.
- The push triggers Workers Builds: migrations apply, Worker redeploys. So
  "update" = one click on the Actions tab (or `git pull upstream` for git
  users).
- If the member edited their copy, `--ff-only` fails visibly and the workflow
  prints what to do (their edits are never clobbered).
- Version surfacing: a `VERSION` file at repo root. The Worker embeds it and
  returns it from `/api/health`; the dashboard footer shows `vX.Y.Z`. The
  footer also checks
  `https://raw.githubusercontent.com/NicoSKOOL/seo-os-ai-ranking/main/VERSION`
  (client-side fetch, fail-silent) and shows "Update available" with a link to
  the member's own Actions page when upstream is ahead.

### 6. VPS side (retained from the July 1 spec, unchanged in substance)

- `dashboard/public/install-vps.sh` served by the member's own Worker. It:
  verifies Hermes + venv, downloads `seo_os_sync.py` + `acp_chat.py` from the
  member's Worker, creates the local SQLite from a bundled local schema,
  registers clients interactively from `hermes profile list`, writes
  `/root/.seo-os-sync.env` (`SEO_OS_CHAT_ENABLED=true`,
  `SEO_OS_EXECUTE_ENABLED` OFF by default with a printed opt-in one-liner),
  installs + starts systemd `seo-os-sync.service`, runs one `--once` push.
- `install-vps.sh --update` re-downloads the scripts + restarts the service.
  Because the bridge downloads from the member's own Worker, a dashboard
  update automatically makes the matching bridge available; the bridge logs
  "update available" when its version is behind the served one.
- Drift guard test (byte-identical `scripts/` vs `dashboard/public/` copies)
  stays mandatory.

## Live-test verification (before announcing to the community)

Three deploy-button behaviors are documented thinly; verify on a throwaway
GitHub account + throwaway Cloudflare account, with fallbacks:

1. Subdirectory deploy of `dashboard/` works ("must be fully isolated within
   that subdirectory"). FALLBACK: dedicated public `seo-os-dashboard` repo
   kept in sync by a publish script.
2. `wrangler d1 migrations apply DB --remote` works against an
   auto-provisioned database (known issue workers-sdk#13632 with d1
   subcommands and omitted database_id). FALLBACK: the Worker applies
   migrations itself on first boot / on version change (it has the D1 binding;
   track applied names in a `schema_migrations` table).
3. The bundled GitHub Action is runnable in a deploy-button clone with default
   Actions permissions. FALLBACK: documented two-command manual sync in
   UPDATING.md.

## New / changed files

- `dashboard/wrangler.jsonc` (tracked template, no IDs) +
  `dashboard/wrangler.local.jsonc` (git-ignored, Nico's).
- `dashboard/migrations/` (Wrangler-convention migrations; `src/db/schema.sql`
  retired into `0001_init.sql`; `src/db/seed-demo.sql` stays for demos only).
- Worker: first-boot wizard route + `POST /api/setup`; `COOKIE_SECRET` KV
  fallback; `VERSION` in `/api/health`.
- `dashboard/public/install-vps.sh` (from the July 1 spec) +
  `dashboard/db/local-schema.sql` (bundled local SQLite schema).
- `.github/workflows/seo-os-update.yml` (workflow_dispatch only).
- `VERSION` (repo root).
- `README.md`: Deploy button + member quick start. `SETUP.md`: full member
  walkthrough. `UPDATING.md`: the one-click update + manual fallback.
  `HERMES-INTEGRATION.md`: the conventions contract (unchanged scope).
- `package.json`: the migrations-then-deploy `deploy` script.
- `.gitignore`: `wrangler.local.jsonc`, `*.env`.

## Testing

- Unit: PBKDF2/sha256 helpers against the Worker format; drift-guard test;
  migration-merge test (fresh `0001_init` db schema == current live schema,
  compared via `sqlite_master`).
- `bash -n` on `install-vps.sh`; wizard flow on local `wrangler dev` + D1
  (setup once, 403 after, login works, token hash matches).
- Live smoke: full deploy-button run on throwaway accounts (the three
  verification items above), then delete.

## Out of scope (v1)

- Hosted multi-tenant onboarding and signup.
- Change-password UI (manual d1 update, documented).
- Windows VPS (Linux + systemd assumed).
- Auto-configuring member agents to write to the db (HERMES-INTEGRATION.md
  documents the conventions; not automated).
- Scheduled auto-updates (explicitly rejected; manual only).
