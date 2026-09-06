// Builds src/ into public/: resolves partial includes, then copies everything
// except the partials themselves and the Tailwind input (built by build:css).
//
// Includes use the SSI comment syntax the pages already had, extended with
// attributes that fill {{placeholders}} in the partial:
//   <!--#include virtual="/partials/head.html" title="Feed" -->
// Resolving at build time means nginx no longer needs `ssi on`, and the site
// works on any static host.
//
// Every page also gets `site`, `url`, `slug` and `image` for free, derived from
// its own path -- see pageContext(). Pages never restate their own URL, so a
// page copied to a new directory cannot end up with a stale canonical link.
import { cpSync, readFileSync, writeFileSync, rmSync, mkdirSync, readdirSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { escapeHtml } from "./lib/html.mjs";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const src = path.join(root, "src");
const dest = path.join(root, "public");
const SITE = "https://espifam.com";

const skip = new Set(["styles", "partials"]);
const isSkipped = (rel) => skip.has(rel.split(path.sep)[0]);

const partialCache = new Map();
function readPartial(virtualPath) {
  if (!partialCache.has(virtualPath)) {
    partialCache.set(virtualPath, readFileSync(path.join(src, virtualPath.replace(/^\//, "")), "utf8"));
  }
  return partialCache.get(virtualPath);
}

const INCLUDE = /<!--#include\s+virtual="([^"]+)"([\s\S]*?)-->/g;
const ATTR = /(\w+)="([^"]*)"/g;
const PLACEHOLDER = /\{\{(\w+)\}\}/g;
// {{#if key=value}}...{{/if}} -- the only thing it needs to express is
// "this nav link is the current page".
const CONDITIONAL = /\{\{#if\s+(\w+)=([^}]*)\}\}([\s\S]*?)\{\{\/if\}\}/g;

// A page at src/josh/index.html is /josh/, slug "josh"; src/index.html is /,
// slug "home". `image` names the OG card, falling back to the family card when
// a page has none -- so adding one to src/assets/og/ is all it takes to use it.
function pageContext(rel) {
  const url = `${SITE}/${rel.split(path.sep).join("/").replace(/(^|\/)index\.html$/, "$1")}`;
  const slug = rel === "index.html" ? "home" : rel.split(path.sep)[0].replace(/\.html$/, "");
  const image = existsSync(path.join(src, "assets", "og", `${slug}.png`)) ? slug : "family";
  return { site: SITE, url, slug, image };
}

function render(html, ctx, depth = 0) {
  if (depth > 5) throw new Error("include nesting too deep (circular?)");
  return html.replace(INCLUDE, (_, virtualPath, attrSrc) => {
    // An explicit attribute on the include wins over the derived context.
    const attrs = { ...ctx, ...Object.fromEntries([...attrSrc.matchAll(ATTR)].map(([, k, v]) => [k, v])) };
    const filled = readPartial(virtualPath)
      .replace(CONDITIONAL, (_m, key, value, inner) => (attrs[key] === value ? inner : ""))
      .replace(PLACEHOLDER, (_m, key) => {
        const value = attrs[key];
        if (value === undefined) throw new Error(`${virtualPath}: no value for {{${key}}}`);
        return escapeHtml(value);
      });
    // attrs, not ctx: a nested include sees the values its caller passed.
    return render(filled, attrs, depth + 1).trimEnd();
  });
}

function walk(dir, out = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else out.push(full);
  }
  return out;
}

rmSync(dest, { recursive: true, force: true });
mkdirSync(dest, { recursive: true });

// HTML is rendered from src below rather than copied and rewritten in place.
cpSync(src, dest, {
  recursive: true,
  filter: (source) =>
    source === src || (!isSkipped(path.relative(src, source)) && !source.endsWith(".html")),
});

// feed-config.js holds the API key and is gitignored, so it is absent on a
// fresh clone. Fall back to the example so the page degrades to a message
// instead of a 404 in the console.
const feedConfig = path.join(dest, "js", "feed-config.js");
if (!existsSync(feedConfig)) {
  cpSync(path.join(dest, "js", "feed-config.example.js"), feedConfig);
}

const pages = [];
for (const file of walk(src)) {
  const rel = path.relative(src, file);
  if (!file.endsWith(".html") || isSkipped(rel)) continue;
  const out = path.join(dest, rel);
  mkdirSync(path.dirname(out), { recursive: true });
  writeFileSync(out, render(readFileSync(file, "utf8"), pageContext(rel)));
  pages.push(rel);
}

const urls = pages
  .filter((p) => p !== "404.html")
  .map((p) => pageContext(p).url)
  .sort();

writeFileSync(
  path.join(dest, "sitemap.xml"),
  `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((u) => `  <url><loc>${u}</loc></url>`).join("\n")}
</urlset>
`
);

writeFileSync(
  path.join(dest, "robots.txt"),
  `User-agent: *\nAllow: /\n\nSitemap: ${SITE}/sitemap.xml\n`
);

console.log(`built ${pages.length} pages, ${urls.length} sitemap urls`);
