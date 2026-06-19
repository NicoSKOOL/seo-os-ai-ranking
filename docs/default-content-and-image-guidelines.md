# SEO OS default content and image guidelines

These are the community-safe writing and image defaults for SEO OS. They are inspired by workflows proven on Nico's Astro/Cloudflare sites, but they must be adapted per client. Do not copy AI Ranking's tone, brand, examples, or image style unless the user explicitly wants that.

## Default content deliverable

For community users, the safest default is:

```text
SEO opportunity
  -> content brief
  -> Google Doc draft
  -> user review
  -> user or web person publishes manually
  -> SEO OS monitors results
```

Advanced users can connect Astro/Cloudflare staging, Git, or WordPress draft creation later.

## Required blog draft components

Most SEO OS blog drafts should include:

- title
- meta title
- meta description
- TL;DR near the top
- direct answer to the search intent in the opening
- content capsules for about 60 to 70 percent of the article
- contextual internal links
- contextual external source links
- FAQ section near the end
- CTA aligned with the business goal
- suggested feature image brief using the site's own image style guide

## Content capsule technique

Content capsules are short, self-contained sections that answer one specific sub-question.

Use capsules for roughly 60 to 70 percent of most blog posts. The rest can be normal narrative, examples, deeper explanation, or walkthroughs.

Each capsule should usually have:

1. A specific subheading
2. A direct answer first
3. Evidence, source, example, or practical context
4. A next step or implication
5. An internal link where useful

Example capsule pattern:

```text
## How long does [thing] take?

[Direct answer in one or two sentences.]

[Supporting detail, example, or source-backed explanation.]

[What the reader should do next, with a contextual internal link if relevant.]
```

Avoid turning the article into random disconnected snippets. Capsules should still build toward the article's main promise.

## Internal linking requirements

Every draft should include a link plan.

Recommend:

- 2 to 5 internal links in the article body
- 1 CTA link if the site has a conversion page
- 2 to 3 suggested up-links from existing pages to the new article, where possible

Internal links should point to relevant:

- service pages
- product pages
- location pages
- related blog posts
- resource pages
- booking/contact/conversion pages

Rules:

- Use descriptive anchor text.
- Never use "click here".
- Link to sections/pages that genuinely help the reader.
- Check that the target URL exists or mark it as a suggested new page.

## External source requirements

Back up claims with high quality sources.

Use external links for:

- statistics
- platform behavior
- technical claims
- legal/medical/finance/safety claims
- news or market claims
- research findings

Rules:

- Link the contextual keyword or claim directly.
- Prefer original or official sources: documentation, government data, academic papers, primary research, reputable industry reports.
- Do not use thin AI-written blogs as evidence.
- Do not add a generic "Sources" dump unless the user asks for a bibliography.
- If the claim cannot be sourced, qualify it or remove it.

## TL;DR requirements

The TL;DR should sit near the top and include 3 to 5 bullets.

It should:

- answer the main search intent quickly
- summarize the practical takeaway
- mention the next step where appropriate
- avoid generic filler

## FAQ requirements

Add an FAQ section near the end when useful.

Rules:

- 3 to 6 FAQs is usually enough.
- Use real objections, search questions, or People Also Ask style questions.
- Answer directly.
- Avoid repeating the same answer in different words.
- Add internal links only where useful.

## Style guardrails

Use the site's voice and audience, not Nico's.

Default writing style:

- practical
- specific
- sourced
- low hype
- easy to skim
- natural enough that it does not sound like a generic AI post

Avoid:

- unsupported claims
- keyword stuffing
- filler intros
- generic AI phrases
- overpromising
- em dashes in final copy
- title case headings unless the site already uses them

## Image style guide onboarding

As part of onboarding, ask if the user wants SEO OS to generate a website-specific image style guide.

If yes, collect:

- website URL
- brand colors
- existing images to match
- existing images to avoid
- audience
- desired mood
- whether images should use text
- preferred style: editorial illustration, abstract, screenshot-led, photography, icon-based, etc.

Then create:

```text
/root/seo-sites/<domain>/image-style-guide.md
```

Feature images should follow that guide so the site's blog has a consistent visual identity.

## Feature image rules

Default rules:

- use 16:9 for blog feature images
- prefer WebP
- write descriptive alt text
- avoid fake screenshots/dashboards unless the user explicitly wants that
- avoid watermarks, logos, gibberish text, distorted faces, and copyrighted characters
- visually inspect generated images before using them

## Approval copy

Use this for Google Doc drafts:

```text
Approve Google Doc draft creation?

This lets Hermes create a content brief and blog draft in Google Docs.
It does not publish anything to your website.
Publishing, slug changes, redirects, canonical/noindex, and CMS edits remain separately gated.
```

Use this for image style guide creation:

```text
Do you want Hermes to create an image style guide for this website?

This helps future feature images stay consistent with your brand.
Hermes will inspect the site, summarize the visual direction, and create a reusable prompt/style guide for future blog images.
```
