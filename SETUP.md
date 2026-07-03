# Set up your SEO OS dashboard

## What you need before starting

- Hermes v0.17+ running on your VPS (Linux with systemd), with at least one
  client profile.
- A free GitHub account and a free Cloudflare account (2 minutes each to
  create if you do not have them).

## Step 1: Deploy your dashboard (about 3 minutes)

Click the **Deploy to Cloudflare** button in the README. Sign in to
Cloudflare when asked. Cloudflare copies the project into your GitHub account
and sets everything up: your own dashboard website, your own database. When
it finishes, open your new dashboard URL.

## Step 2: Create your account (1 minute)

The first time you open your dashboard it asks you to create your login:
your email and a password. It then shows your **agent token** ONCE. Copy it
somewhere safe: this is the key your VPS uses to talk to your dashboard. It
also shows the single command for the next step.

## Step 3: Connect your VPS (about 5 minutes)

SSH into your VPS and paste the command from the previous screen. It asks a
few simple questions (which of your Hermes clients to show) and starts the
connection. When it says SUCCESS, refresh your dashboard: your clients are
live.

## After setup

- Your dashboard refreshes from your VPS every couple of minutes.
- Updates are manual and announced in the community: see UPDATING.md.
- Two honest caveats: some screens (Opportunities, Metrics, Jobs) stay empty
  until your Hermes agents write to your SEO OS database (see
  HERMES-INTEGRATION.md for how to wire that up). And approve-to-execute
  ships switched OFF for safety; the installer prints the one-line command
  to turn it on when you are ready.

## Troubleshooting

- **The wizard says "Setup is already complete" on a fresh deploy**: someone
  claimed the URL before you. Redeploy with a fresh database and open it
  right away.
- **First push failed**: run `systemctl status seo-os-sync` on the VPS and
  check the dashboard URL and token in `/root/.seo-os-sync.env`.
- **Forgot your password**: see the reset command in UPDATING.md (a one-line
  database update).
- **"Hermes not found on PATH" during the VPS command**: the installer looks
  for `hermes` before doing anything else. Confirm you are on v0.17 or later
  (`hermes --version`) and that it is on the same PATH the SSH session uses.
  If you installed Hermes as a different user, run the install command as
  that user, or add it to root's PATH.
- **The VPS command asks for "Path to Hermes venv python" and you are not
  sure**: press Enter to skip it. Everything still connects and your clients
  still show up. You only need this path for the in-dashboard chat feature,
  which you can wire up later by re-running the install command.
- **Dashboard shows your clients but every screen under Opportunities,
  Metrics, and Jobs is empty**: this is expected on a brand-new connection.
  Those screens only populate once your Hermes agents write rows to your
  local SEO OS database. See HERMES-INTEGRATION.md.
- **You ran the VPS command twice by accident**: it is safe to re-run. It
  overwrites the same config file (keeping a timestamped backup) and restarts
  the same background service, it does not create duplicates.
- **Nothing happens after "Registering your clients"**: the command is
  waiting on a `y`/`n` prompt in your terminal. Answer `n` if you do not want
  to add a client right now; you can add one later by re-running the
  command.
- **Still stuck**: post your exact error message in the community. Do not
  paste your agent token or your dashboard URL along with it; a screenshot
  with those blurred out is fine.
