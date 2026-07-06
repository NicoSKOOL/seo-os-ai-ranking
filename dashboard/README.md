# Your SEO OS Dashboard

This repo is YOUR copy of the [SEO OS dashboard](https://github.com/NicoSKOOL/seo-os-ai-ranking),
created by the Deploy to Cloudflare button. It runs entirely on your own
Cloudflare account: your Worker, your database, your data.

- **Setup walkthrough:** [SETUP.md](https://github.com/NicoSKOOL/seo-os-ai-ranking/blob/main/SETUP.md)
- **Connecting your VPS agent:** [HERMES-INTEGRATION.md](https://github.com/NicoSKOOL/seo-os-ai-ranking/blob/main/HERMES-INTEGRATION.md)

## Updating

Updates are manual on purpose: nothing changes until you trigger it.

**First time only:** GitHub does not allow Cloudflare's bot to install the
update workflow for you, so add it once yourself: click **Add file** ->
**Create new file** in this repo, name it exactly
`.github/workflows/seo-os-update.yml`, paste the contents of
[the workflow file](https://raw.githubusercontent.com/NicoSKOOL/seo-os-ai-ranking/main/dashboard/.github/workflows/seo-os-update.yml),
and commit.

Then, whenever you want to update:

1. Open the **Actions** tab of this repo, choose **SEO OS Update**, click
   **Run workflow**.
2. Wait about two minutes. Cloudflare redeploys your dashboard automatically.
   Database changes are always additive, so your data, login, and clients are
   untouched.
3. Update the VPS bridge too, on your VPS:

       bash /root/install-vps.sh --update

The update overwrites the app files with the latest official version. Your
`wrangler.jsonc` (your Cloudflare resource IDs) and this repo's workflow are
never touched. If you customized app code, your edits will be replaced, but
nothing is lost: they stay in your git history.

## Forgot your password

From this repo's folder on your machine (needs Node, logged in to your
Cloudflare account with `npx wrangler login`):

    python3 -c 'import hashlib,os; s=os.urandom(16); pw=input("New password: "); print("pbkdf2$100000$"+s.hex()+"$"+hashlib.pbkdf2_hmac("sha256",pw.encode(),s,100000).hex())'
    npx wrangler d1 execute DB --remote --command \
      "UPDATE account_members SET password_hash='<paste the printed value>' WHERE email='<your email>'"
