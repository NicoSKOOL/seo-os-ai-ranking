# Updating your SEO OS dashboard

Updates are manual on purpose: nothing changes until you trigger it.

## The one-click way

1. Open YOUR copy of this repo on GitHub.
2. Click the **Actions** tab, choose **SEO OS Update**, click **Run workflow**.
3. Wait about two minutes. Cloudflare redeploys your dashboard automatically
   (database changes apply themselves and are always additive, so your data,
   login, and clients are untouched).
4. Update the VPS bridge too (takes 10 seconds), on your VPS:

       bash /root/install-vps.sh --update

## If the workflow says it cannot fast-forward

You edited your copy, so the update will not overwrite it. Either undo your
edits, or merge by hand:

    git clone <your-repo> && cd <your-repo>
    git remote add upstream https://github.com/NicoSKOOL/seo-os-ai-ranking.git
    git fetch upstream main && git merge upstream/main   # resolve, commit
    git push

## How you know an update exists

The dashboard footer shows your version and an "Update available" link when
the upstream version is newer.

## Forgot your password

From the `dashboard/` folder of your repo clone (needs Node + wrangler,
logged in to your Cloudflare account):

    python3 -c "import hashlib,os; s=os.urandom(16); pw=input('New password: '); print('pbkdf2$100000$'+s.hex()+'$'+hashlib.pbkdf2_hmac('sha256',pw.encode(),s,100000).hex())"
    npx wrangler d1 execute seo-os-db --remote --command \
      "UPDATE account_members SET password_hash='<paste the printed value>' WHERE email='<your email>'"
