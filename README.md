# espifam-site

Static site for espifam.com.


## Scripts

- `npm run dev` — Tailwind watch → `src/styles/output.css`
- `npm run build` — clean `public/`, copy `src/`, compile minified CSS
- `npm run deploy` — build, then rsync `public/` to `$ESPIFAM_DEPLOY_TARGET`

## Per-member accent

Pages set `data-member` on `<body>`. [src/styles/input.css](src/styles/input.css) maps it to `--accent`.

## Deploy

```bash
export ESPIFAM_DEPLOY_TARGET="user@nginx-host:/var/www/html/espifam.com/"
npm run deploy
```
