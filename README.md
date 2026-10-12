# espifam-site

Static site for espifam.com, built with Tailwind CSS v4.

## Local Development

```bash
npm install
npm run dev
```

Open `http://localhost:8085`. This builds the site into `public/`, serves it,
and rebuilds on every change in `src/`.

## Build

```bash
npm run build
```

Output goes to `public/`. The build inlines the shared partials (`src/partials/`),
marks the current nav link, and versions `styles.css` by content hash, so any
static file server can host it. No nginx SSI is required.

## Partials

Pages pull shared markup from `src/partials/` with an include comment. Attributes
fill the partial's `{{key}}` placeholders; a missing one fails the build.

```html
<!--#include virtual="/partials/head.html" title="Espi · espifam" description="…" -->
<!--#include virtual="/partials/member-card.html" slug="josh" avatar="josh" role="dad" name="Espi" blurb="…" -->
<!--#include virtual="/partials/thumb.html" src="/assets/avatars-ciw/espi" alt="…" caption="…" -->
```

- `head.html` needs `title` and `description`. Add `noindex="true"` to keep a
  page out of search and the sitemap (the 404 page does this).
- `thumb.html` expects `<src>-thumb.webp` (192px) next to `<src>.webp` (lightbox).
- Partials can also use `{{site}}`, `{{url}}`, `{{image}}` and `{{cssVersion}}`,
  and `{{#if key}}…{{/if}}` / `{{#if !key}}…{{/if}}` blocks.

## Social images

Each page's `og:image` is `src/assets/og/<page>.png` (1200×630), falling back to
`family.png`. These are hand-maintained; update them when a name, tagline or
avatar changes.

## Feed

The Feed page needs a YouTube Data API key. Copy `src/js/feed-config.example.js`
to `src/js/feed-config.js` (gitignored) and fill it in. The key is visible in the
browser, so restrict it to your domains (HTTP referrers) in Google Cloud Console.

## Deploy

```bash
export ESPIFAM_DEPLOY_TARGET="user@nginx-host:/var/www/html/espifam.com/"
npm run deploy
```

The deploy swaps the new build into place atomically. To use the custom 404 page,
add `error_page 404 /404.html;` to the nginx server block.
