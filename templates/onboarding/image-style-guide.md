# Website Image Style Guide

Client: {{client_name}}
Domain: {{domain}}
Status: draft

Use this guide before generating feature images, in-body graphics, or visual assets for this website.

## Goal

Create a consistent visual system for this site's SEO content so images feel like they belong to the same brand.

Do not copy another brand's visual style unless the user explicitly asks for it.

## Brand inputs to collect

- Website URL:
- Brand colors:
- Logo or brand assets:
- Existing image examples to match:
- Existing image examples to avoid:
- Target audience:
- Desired mood:
- Industry/category:
- Image use cases:

## Default image rules

- Feature image aspect ratio: 16:9
- Preferred output: WebP
- Keep visuals consistent across articles
- Avoid fake dashboards, fake UI, fake charts, or unreadable text unless explicitly requested
- Avoid logos, watermarks, distorted faces, gibberish text, and copyrighted characters
- Add descriptive alt text for every image

## Style direction

Choose one primary style:

- clean editorial illustration
- abstract brand shapes
- practical screenshot-led tutorial image
- local/business photography style
- simple icon-based explainer
- premium SaaS/product illustration
- hand-drawn educational style
- other:

## Palette

Primary colors:

Secondary colors:

Background style:

Accent colors:

Colors to avoid:

## Composition

Preferred layout:

- centered hero object
- split composition
- layered abstract shapes
- photo with subtle branded overlay
- icon grid
- tutorial/screenshot collage
- other:

Recurring motifs:

Lighting/mood:

Texture/detail level:

## Text policy

Feature image text:

- none
- 1 to 3 words max
- exact article concept only
- title text allowed
- other:

Font/text style:

Text to avoid:

## Prompt template

Use this as the starting prompt for feature images:

```text
Create a 16:9 feature image for a blog post on [TOPIC] for [CLIENT/SITE].
Style: [STYLE DIRECTION].
Palette: [PALETTE].
Composition: [COMPOSITION].
Mood: [MOOD].
Visual motifs: [MOTIFS].
Text policy: [TEXT POLICY].
Avoid: watermarks, logos, gibberish text, distorted faces, fake dashboards, clutter, copyrighted characters, off-brand colors.
```

## Negative prompt

```text
watermark, logo, unreadable text, gibberish text, distorted face, extra fingers, fake dashboard, fake UI, cluttered layout, copyrighted character, low quality, blurry, off-brand colors
```

## Approval checklist

Before using an image:

- [ ] Matches this site's style guide
- [ ] Fits the article topic
- [ ] No gibberish text
- [ ] No logos or watermarks
- [ ] No fake screenshots or fake dashboards unless explicitly intended
- [ ] Image is WebP or ready for WebP conversion
- [ ] Alt text is written
- [ ] User approved if approval policy requires it
