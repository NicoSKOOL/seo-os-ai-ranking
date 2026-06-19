# SEO OS content writing and publishing modes

SEO OS needs to support different website stacks without forcing every user into Astro, Cloudflare, GitHub, or WordPress automation.

## Default recommendation

For the community starter kit, the default content workflow should be Google Docs draft-first.

Why:

- works for WordPress, Wix, Squarespace, Shopify, Webflow, custom sites, and static sites
- avoids requiring write access to a client CMS
- keeps publishing human-approved
- is easy for business owners and agencies to understand
- creates a clean review artifact the user can edit, comment on, or hand to their web person

## Publishing modes

### Mode 1: Google Doc draft, manual publish

This should be the default for new/community users.

Flow:

```text
SEO opportunity
  -> content brief
  -> Google Doc draft
  -> send doc link to operator/client
  -> user reviews and edits
  -> user publishes manually in their CMS
  -> SEO OS records publish date/URL when provided
  -> SEO OS monitors GSC/GA4 results
```

Allowed after approval:

- create a content brief
- create a Google Doc draft
- include suggested title/meta/H1/schema/internal links
- notify the user with the doc link

Still gated:

- publishing
- updating CMS pages
- changing slugs
- redirects
- canonical/noindex
- deleting or replacing existing content

### Mode 2: Astro/Cloudflare/Git staging, then approved deploy

Use this for Nico's sites and users who have a Git-based static site workflow.

Flow:

```text
SEO opportunity
  -> content brief or code/content diff
  -> branch or local draft
  -> staging/preview URL
  -> user approves preview
  -> merge/deploy after explicit production approval
  -> monitor results
```

This mode requires:

- repo access
- known build command
- hosting/deploy path
- staging or preview URL support
- rollback plan
- clear production approval boundary

Do not make this the default community path. It is powerful but too stack-specific.

### Mode 3: WordPress integration, optional advanced path

For WordPress users, start with Google Docs unless they deliberately connect WordPress.

Possible advanced options:

- WordPress MCP server
- WordPress REST API with application passwords
- a trusted WordPress plugin/API bridge
- Zapier/Make/manual import from Google Docs

Safe WordPress v1 policy:

- create drafts only, not publish
- never install plugins automatically
- never change theme/templates automatically
- never edit redirects, permalinks, canonical, noindex, or SEO plugin settings without explicit approval
- require the user to verify staging/live target before any write

Recommended WordPress flow if connected:

```text
Google Doc draft approved
  -> create WordPress draft post/page
  -> return edit link
  -> user reviews in WordPress
  -> user publishes or gives explicit publish approval
```

## Onboarding field

Every client should have a `content_delivery_mode`:

- `google_doc` default
- `astro_cloudflare_staging`
- `wordpress_draft`
- `manual_only`

Also capture:

- CMS/platform
- repo/hosting access, if any
- staging URL, if any
- publish approver
- who manually publishes if SEO OS is draft-only

## Community positioning

Say this clearly in the starter kit:

> SEO OS does not need direct access to your website to be useful. The safest default is to create Google Docs drafts with SEO recommendations, then you or your web person publish them. Advanced users can connect Git-based sites or WordPress later.

## Approval copy for content work

Use wording like:

```text
Approve Google Doc draft creation?

This lets Hermes create a content brief and draft in Google Docs.
It does not publish anything to your website.
Publishing, slug changes, redirects, canonical/noindex, and CMS edits remain separately gated.
```

For staging sites:

```text
Approve staging draft?

This lets Hermes create a branch/staging preview for review.
It does not merge, deploy to production, or publish live changes.
Production deploy remains separately gated.
```

For WordPress drafts:

```text
Approve WordPress draft creation?

This lets Hermes create a draft post/page in WordPress for review.
It does not publish the post/page or change site settings.
```
