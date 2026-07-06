# Updating your SEO OS dashboard

Updates are manual on purpose: nothing changes until you trigger it.

Your repo was created by the Deploy to Cloudflare button, which copies this
repo's `dashboard/` folder into your own repo with a fresh history. Updates
therefore work by overlay, not by git merge: the update workflow copies the
latest official app files over your copy and commits the result.

## First time only: add the update workflow

GitHub does not allow Cloudflare's bot to install workflows, so your copy was
created without one. Add it once yourself (30 seconds): in YOUR repo click
**Add file** -> **Create new file**, name it exactly
`.github/workflows/seo-os-update.yml`, paste the contents of
[the workflow file](https://raw.githubusercontent.com/NicoSKOOL/seo-os-ai-ranking/main/dashboard/.github/workflows/seo-os-update.yml),
and commit. (Cloudflare will run one harmless redeploy.)

## The one-click way

1. Open YOUR copy of the repo on GitHub.
2. Click the **Actions** tab, choose **SEO OS Update**, click **Run workflow**.
3. Wait about two minutes. Cloudflare redeploys your dashboard automatically
   (database changes apply themselves and are always additive, so your data,
   login, and clients are untouched).
4. Update the VPS bridge too (takes 10 seconds), on your VPS:

       bash /root/install-vps.sh --update

## What the update does and does not touch

- **Replaced:** all app files (Worker source, UI, migrations), with the latest
  official versions.
- **Never touched:** your `wrangler.jsonc` (it holds YOUR Cloudflare resource
  IDs) and the `.github/` workflow itself.
- If you customized app code, your edits are replaced by the update, but
  nothing is lost: every previous version stays in your git history.

## The manual way (no Actions)

    git clone <your-repo> && cd <your-repo>
    git clone --depth 1 https://github.com/NicoSKOOL/seo-os-ai-ranking.git /tmp/upstream
    rsync -a --delete --exclude .git --exclude .github --exclude wrangler.jsonc \
      /tmp/upstream/dashboard/ ./
    git add -A && git commit -m "SEO OS update" && git push

## How you know an update exists

The dashboard footer shows your version and an "Update available" link when
the upstream version is newer.

## Forgot your password

From your repo's folder (needs Node, logged in to your Cloudflare account
with `npx wrangler login`):

    python3 -c 'import hashlib,os; s=os.urandom(16); pw=input("New password: "); print("pbkdf2$100000$"+s.hex()+"$"+hashlib.pbkdf2_hmac("sha256",pw.encode(),s,100000).hex())'
    npx wrangler d1 execute DB --remote --command \
      "UPDATE account_members SET password_hash='<paste the printed value>' WHERE email='<your email>'"
