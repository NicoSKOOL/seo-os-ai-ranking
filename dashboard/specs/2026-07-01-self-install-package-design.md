# SEO OS Dashboard: self-install package design

Date: 2026-07-01
Status: Approved. Ready for implementation plan.
Owner: Nico (AI Ranking)

## Goal

Let a community member who already runs Hermes on a Hostinger (or any) VPS stand
up their OWN SEO OS dashboard (their own Cloudflare Worker + D1, their own URL,
their own data) with the least possible effort: two commands, a few prompts, done.

Self-install only (they own the Cloudflare deployment). No hosted/multi-tenant
onboarding in this package.

## The honest prerequisite

"Has Hermes on a VPS" is necessary but not sufficient. The dashboard is a window
onto SEO OS conventions: a local SQLite db, client rows mapped to Hermes profiles,
and agents that write to that db. The package must therefore set up not just the
plumbing but those conventions, and be upfront that some screens (Opportunities,
Metrics, Jobs) stay empty until the member's agents write to the db.

Assumed of the member: a VPS with Hermes v0.17+ running, at least one Hermes client
profile, a Cloudflare account, and `wrangler` installed + logged in on the machine
they run the Cloudflare step from. Everything else the package provides.

## Prerequisite bug to fix first (blocks the whole package)

`dashboard/public/seo_os_sync.py` (served for download at `/seo_os_sync.py`) is a
STALE pre-chat copy. The working bridge is `scripts/seo_os_sync.py` (Stages 1+2).
The public copy must be kept byte-identical, and `scripts/acp_chat.py` must ALSO be
served for download (it is not currently). Fix: copy both into `dashboard/public/`
and add a check so they cannot drift again (a test comparing the two bridge copies).

## Two commands, two sides

### Side A: Cloudflare (`dashboard/setup.sh`, run once on the member's machine)
One command provisions and deploys the dashboard.

Steps the script performs:
1. Preflight: `wrangler --version` and `wrangler whoami` (fail with a clear message
   if not logged in); `python3` present.
2. Prompt: worker name (default `seo-os`), operator email, password (twice).
3. Provision: `wrangler d1 create <name>-db`, `kv namespace create`, `r2 bucket
   create`. Read the created IDs back via `wrangler d1 list --json` etc. (robust,
   not stdout scraping).
4. Config: render `wrangler.jsonc` from `wrangler.example.jsonc` with the name + IDs.
5. Schema: apply `src/db/schema.sql` then every file in `src/db/migrations/` in
   lexical order, `--remote`.
6. Secret: `wrangler secret put COOKIE_SECRET` with a generated random value.
7. Account: generate a random agent token; compute the PBKDF2 password hash
   (`pbkdf2$100000$<saltHex>$<hashHex>`, matching the Worker's verifyPassword);
   insert one `accounts` row (plan `self_install`, `agent_token_hash` = sha256 of
   the token) + one `account_members` row (email + password_hash), via
   `wrangler d1 execute --remote --command`.
8. Deploy: `wrangler deploy`.
9. Print a summary block: dashboard URL, login email, the AGENT TOKEN (shown once),
   and the exact one-line VPS command to run next (curl the VPS installer from
   their own new URL).

Idempotency: if a resource already exists, look it up and reuse it instead of
failing, so a re-run repairs rather than duplicates. The account step upserts.

### Side B: the VPS (`install-vps.sh`, served by their own Worker)
The member pastes ONE command (printed by side A) that curls
`https://<their-worker>.workers.dev/install-vps.sh | bash`. It:
1. Prompts for (or accepts as args) the dashboard URL + agent token.
2. Verifies `hermes acp --check`; auto-detects the Hermes venv python
   (`hermes` launcher path -> venv), falls back to asking.
3. Downloads the CURRENT `seo_os_sync.py` + `acp_chat.py` from their Worker into
   `/root/seo-os-dashboard/scripts/` (and `/root/` where the service expects them).
4. Creates the local SQLite at `/root/seo-os-dashboard/data/seo-os.sqlite` from the
   bundled local schema (the 9 SEO OS tables from `server.py`), if absent.
5. Registers clients interactively: lists `hermes profile list`, and for each
   client the member wants, captures name + domain + profile + workspace and
   inserts a `clients` row. (Skippable; can be re-run.)
6. Writes `/root/.seo-os-sync.env`: `SEO_OS_URL`, `SEO_OS_TOKEN`, `SEO_OS_DB`,
   `SEO_OS_CHAT_ENABLED=true`, and `SEO_OS_EXECUTE_ENABLED` (default OFF, with a
   printed one-liner to turn on later).
7. Installs + starts systemd `seo-os-sync.service`.
8. Runs one `--once` push and reports success, so the member immediately sees their
   clients in the dashboard.

Safety: execute-on-approval ships OFF; the member opts in explicitly. The token is
only stored in the chmod-600 env file. Backups of any replaced file are kept.

## New / changed files

- Fix: `dashboard/public/seo_os_sync.py` (refresh to current) + add
  `dashboard/public/acp_chat.py` (new download).
- `dashboard/wrangler.example.jsonc` - template with `__WORKER_NAME__`,
  `__D1_ID__`, `__KV_ID__` placeholders; real `wrangler.jsonc` stays git-ignored
  for self-installers (documented) so no one inherits Nico's IDs.
- `dashboard/setup.sh` - side A installer.
- `dashboard/public/install-vps.sh` - side B installer (served for download).
- `dashboard/scripts/hash_password.py` - tiny helper used by setup.sh to make the
  PBKDF2 hash + token (pure stdlib; unit-tested against the Worker format).
- `SETUP.md` (repo root) - the whole flow, start to finish, with the "some screens
  stay empty until your agents write to the db" caveat.
- `HERMES-INTEGRATION.md` - the conventions contract: what each agent profile
  should write to which table to light up each screen, plus a paste-in snippet for
  a profile's SOUL/AGENTS file. This is what turns an empty shell into a system.
- `dashboard/db/local-schema.sql` - the 9 SEO OS tables extracted from `server.py`
  so the VPS installer can create the local db without running the Flask app.
- `update.sh` (repo root) - `git pull` + `dashboard/setup.sh --update`, prints the
  VPS `--update` one-liner.
- `VERSION` (repo root) - the release version string, surfaced by the Worker and
  read by the bridge.
- `.gitignore` - ignore `wrangler.jsonc` and `*.env`; untrack the current
  `wrangler.jsonc`.
- README refresh pointing at `SETUP.md`.

## Distribution and updates (the repo is the channel)

A Git repo is the right distribution vehicle: it is both how members install and
how they receive updates, and it carries the instructions (SETUP.md, README) with
the code. The member clones it once; every future improvement Nico ships is a
`git pull` + one update command away.

Update flow, two layers that share one source of truth (the repo):

1. **Dashboard/Worker updates.** `dashboard/setup.sh --update`: reads the member's
   existing `wrangler.jsonc` (their IDs, untouched), applies any NEW D1 migrations,
   and `wrangler deploy`. Ships new UI, Worker logic, and schema. Because the member
   config is git-ignored, `git pull` never clobbers their IDs, token, or account.

2. **VPS bridge/runner updates.** The Worker already serves `seo_os_sync.py` +
   `acp_chat.py` for download, so once the Worker is redeployed the new bridge is
   live at the member's own URL. `install-vps.sh --update` (idempotent re-run of the
   download + restart steps) refreshes the VPS with zero reconfiguration.

Making updates safe:
- **Versioning.** A `VERSION` file in the repo. The Worker exposes it (add to
  `/api/health`); the bridge reads its own version and the served one on start and
  logs "update available" when behind. `--update` prints old -> new.
- **Migrations.** Adopt Wrangler's built-in D1 migrations (`wrangler d1 migrations
  apply --remote`), which tracks applied migrations in a `d1_migrations` table so
  only new ones run on an existing member db. All migrations stay additive
  (`CREATE TABLE IF NOT EXISTS`, `ALTER TABLE ADD COLUMN`) so an update never breaks
  a populated database. Move the current `src/db/migrations/*` into the Wrangler
  migrations directory convention as part of this work.
- **Config isolation.** `.gitignore` covers `wrangler.jsonc` and any `.env`;
  Nico's current committed `wrangler.jsonc` gets untracked (his IDs leave git,
  which is also cleaner) and he keeps his local copy. Only `wrangler.example.jsonc`
  is tracked.
- **One-command convenience.** A thin `update.sh` at the repo root that runs
  `git pull` then `dashboard/setup.sh --update`, and prints the VPS `--update`
  one-liner. So "update your dashboard" is a single command for the member.

## Testing

- Unit (`~/venv/bin/python -m pytest`):
  - `hash_password.py`: output parses as `pbkdf2$100000$<hex>$<hex>` and a known
    password + salt reproduces a known hash; the sha256 token hash matches the
    Worker's `sha256Hex`.
  - A drift guard test: `dashboard/public/seo_os_sync.py` is byte-identical to
    `scripts/seo_os_sync.py`.
- Shell: `bash -n` syntax-check both scripts; run `setup.sh` in a dry-run mode
  (`--dry-run` prints the wrangler commands without executing) for a safe CI-ish
  check.
- Live smoke (manual, once): run `setup.sh` against a throwaway worker name in a
  test Cloudflare account, confirm login works and the schema is present, then
  `wrangler delete` to clean up. The VPS side is validated on the real VPS with a
  second "client" pointed at a scratch profile.

## Explicitly out of scope (v1)

- Hosted/multi-tenant onboarding (add-member flow).
- A signup/change-password UI (account is created by the installer; password reset
  stays a documented manual d1 update for now).
- Windows VPS support (assumes Linux + systemd).
- Auto-configuring the member's Hermes agents to write to the db (documented in
  HERMES-INTEGRATION.md, not automated).

## Rollout

Ship as a tagged state of the repo the member clones. `SETUP.md` is the entry
point. Nothing here changes Nico's own live deployment except the (correct) refresh
of the two downloadable files.
