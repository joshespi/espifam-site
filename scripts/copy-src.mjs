// Builds src/ into public/ so any static server can host it:
//   - copies static files (skipping styles/, built separately by build:css,
//     partials/, and hidden pages)
//   - renders each page, inlining <!--#include virtual="/partials/x.html" k="v" -->
//     (recursively, so partials can include partials). In the partial,
//     {{key}} is filled from the include's attributes plus the page vars: site,
//     url, image (its og card in assets/og/, else "family"), year, the theme
//     colors and cssVersion (content hash of styles.css, for cache busting).
//     <!--#each-member virtual="/partials/x.html" --> renders a partial for
//     each member in the roster. {{#if key}}...{{/if}}
//     and {{#if !key}}...{{/if}} keep or drop a block. A missing key fails the
//     build rather than shipping a literal {{key}}.
//   - marks nav links to the current page with aria-current="page"
//   - writes sitemap.xml (skipping pages included with noindex="true") and robots.txt
// Run after build:css so public/styles.css exists, or pass a cssVersion.
import { cpSync, readFileSync, writeFileSync, readdirSync, mkdirSync, existsSync } from "node:fs";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import path from "node:path";

export const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
export const src = path.join(root, "src");
export const dest = path.join(root, "public");
const SITE = "https://espifam.com";
// "feed" is temporary: the page is hidden until the YouTube API key is live.
const EXCLUDED = new Set(["styles", "partials", "feed"]);
const isExcluded = (rel) => EXCLUDED.has(rel.split(path.sep)[0]);

const PARTIAL = /<!--#(include|each-member) virtual="([^"]+)"((?:\s+[\w-]+="[^"]*")*)\s*-->/g;
const ATTR = /([\w-]+)="([^"]*)"/g;
const IF_BLOCK = /\{\{#if (!?)(\w+)\}\}([\s\S]*?)\{\{\/if\}\}/g;
const VAR = /\{\{(\w+)\}\}/g;

function paperColor(css, theme) {
  const match = css.match(new RegExp(`^[ \\t]*--paper-${theme}[ \\t]*:[ \\t]*(#[0-9a-fA-F]{6})[ \\t]*;`, "m"));
  if (!match) throw new Error(`src/styles/input.css needs a six-digit hex color for --paper-${theme}`);
  return match[1];
}

function escapeHtml(text) {
  return text.replace(/[&<>"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[char]);
}

function* htmlFiles(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (isExcluded(path.relative(src, p)) || entry.name === "assets") continue;
    if (entry.isDirectory()) yield* htmlFiles(p);
    else if (entry.name.endsWith(".html")) yield p;
  }
}

export function copySrc({ cssVersion } = {}) {
  cssVersion ??= createHash("sha1")
    .update(readFileSync(path.join(dest, "styles.css")))
    .digest("hex")
    .slice(0, 8);
  const css = readFileSync(path.join(src, "styles", "input.css"), "utf8");
  const darkThemeColor = paperColor(css, "dark");
  const lightThemeColor = paperColor(css, "light");
  const members = JSON.parse(readFileSync(path.join(src, "partials", "members.json"), "utf8")).map((member) => {
    const fields = { ...member, shortName: member.shortName ?? member.name };
    return Object.fromEntries(Object.entries(fields).map(([key, value]) => [
      key, typeof value === "string" ? escapeHtml(value) : value,
    ]));
  });

  cpSync(src, dest, {
    recursive: true,
    filter: (source) => !isExcluded(path.relative(src, source)) && !source.endsWith(".html"),
  });

  const ogDir = path.join(src, "assets", "og");
  const ogImages = new Set(existsSync(ogDir) ? readdirSync(ogDir).map((f) => path.basename(f, ".png")) : []);
  const partials = new Map();
  const partial = (name) => {
    if (!partials.has(name)) {
      partials.set(name, readFileSync(path.join(src, name), "utf8").replace(/\r\n/g, "\n").trimEnd());
    }
    return partials.get(name);
  };

  const urls = [];
  for (const file of htmlFiles(src)) {
    const rel = path.relative(src, file).split(path.sep).join("/");
    const pagePath = "/" + rel.replace(/index\.html$/, "");
    const slug = pagePath.split("/")[1];
    const vars = {
      site: SITE,
      url: SITE + pagePath,
      image: ogImages.has(slug) ? slug : "family",
      cssVersion,
      darkThemeColor,
      lightThemeColor,
      year: String(new Date().getFullYear()),
    };
    let noindex = false;

    const renderPartial = (name, scope) => {
      if (scope.noindex) noindex = true;
      return render(
        partial(name)
          .replace(IF_BLOCK, (_, not, key, body) => (Boolean(scope[key]) !== Boolean(not) ? body : ""))
          .replace(VAR, (_, key) => {
            if (scope[key] === undefined) throw new Error(`${rel}: ${name} needs ${key}="..."`);
            return scope[key];
          }),
        scope,
      );
    };

    const render = (text, scope) =>
      text.replace(PARTIAL, (_, directive, name, attrs) => {
        const inner = { ...scope, ...Object.fromEntries([...attrs.matchAll(ATTR)].map((m) => [m[1], m[2]])) };
        if (directive === "each-member") {
          const clash = [...attrs.matchAll(ATTR)].map((m) => m[1]).find((key) => members.some((member) => key in member));
          if (clash) throw new Error(`${rel}: ${name} attribute "${clash}" collides with a members.json field`);
          return members.map((member) => renderPartial(name, { ...inner, ...member })).join("\n");
        }
        return renderPartial(name, inner);
      });

    const html = render(readFileSync(file, "utf8"), vars)
      .replaceAll(`href="${pagePath}" class="nav-link"`, `href="${pagePath}" class="nav-link" aria-current="page"`);

    const out = path.join(dest, rel);
    mkdirSync(path.dirname(out), { recursive: true });
    writeFileSync(out, html);
    if (!noindex) urls.push(vars.url);
  }

  writeFileSync(
    path.join(dest, "sitemap.xml"),
    `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.sort().map((u) => `  <url><loc>${u}</loc></url>`).join("\n")}
</urlset>
`,
  );
  writeFileSync(path.join(dest, "robots.txt"), `User-agent: *\nAllow: /\n\nSitemap: ${SITE}/sitemap.xml\n`);
}

if (import.meta.main) copySrc();
