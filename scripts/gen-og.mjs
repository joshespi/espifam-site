// Renders the social-share cards (og:image) and the apple-touch-icon with
// headless Chrome. Not part of `npm run build` -- it needs a local Chrome, and
// the output is committed. Re-run only when a member's name, tagline, or
// avatar changes:  npm run og
//
// Colors are read out of src/styles/input.css rather than restated here, so a
// retheme can't leave a stale accent baked into a committed PNG.
import { writeFileSync, mkdirSync, rmSync, readFileSync, accessSync, constants } from "node:fs";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";
import path from "node:path";
import os from "node:os";
import { escapeHtml } from "./lib/html.mjs";

const execFileAsync = promisify(execFile);
const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const assets = path.join(root, "src", "assets");
const outDir = path.join(assets, "og");

const CHROME = process.env.CHROME_PATH ?? [
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/Applications/Chromium.app/Contents/MacOS/Chromium",
  "/Applications/Brave Browser.app/Contents/MacOS/Brave Browser",
  "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
].find((p) => { try { accessSync(p, constants.X_OK); return true; } catch { return false; } });

if (!CHROME) {
  console.error("No Chrome-family browser found. Set CHROME_PATH to render OG images.");
  process.exit(1);
}

const css = readFileSync(path.join(root, "src", "styles", "input.css"), "utf8");
function cssVar(selector, name) {
  const match = css.match(new RegExp(`${selector}\\s*\\{[^}]*--${name}:\\s*(#[0-9a-fA-F]{3,8})`));
  if (!match) throw new Error(`input.css: could not read --${name} from ${selector}`);
  return match[1];
}

const accentFor = (slug) => cssVar(`\\[data-member="${slug}"\\]`, "accent");
const PAGE = cssVar('html\\[data-theme="dark"\\]', "c-page");
const BODY = cssVar('html\\[data-theme="dark"\\]', "c-body");
const MUTED = cssVar('html\\[data-theme="dark"\\]', "c-muted");

const CARDS = [
  { slug: "family", name: "We're the Espis.", tag: "a family of four",
    avatar: "avatars/josh.webp", extra: ["avatars/mom.webp", "avatars/xander.webp", "avatars/odin.webp"] },
  { slug: "josh",   name: "Espi",            tag: "software engineer · gamer",         avatar: "avatars/josh.webp" },
  { slug: "sarah",  name: "Skys",            tag: "captain of this crew",              avatar: "avatars/mom.webp" },
  { slug: "xander", name: "xanderman_luigi", tag: "Luigi · gaming · streams incoming", avatar: "avatars/xander.webp" },
  { slug: "odin",   name: "Ode's",           tag: "our oldest · our heart",            avatar: "avatars/odin.webp" },
];

function cardHtml({ slug, name, tag, avatar, extra }) {
  const accent = accentFor(slug);
  const faces = [avatar, ...(extra ?? [])]
    .map((a, i) => `<img class="face" style="margin-left:${i ? "-28px" : "0"};z-index:${9 - i}" src="file://${path.join(assets, a)}" />`)
    .join("");
  return `<!doctype html><meta charset="utf-8" />
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body {
    width:1200px; height:630px; display:flex; flex-direction:column;
    justify-content:center; gap:34px; padding:0 90px;
    background:${PAGE}; color:${BODY};
    font-family:-apple-system, "SF Pro Display", "Helvetica Neue", sans-serif;
    position:relative; overflow:hidden;
  }
  body::before {
    content:""; position:absolute; top:-320px; right:-220px; width:820px; height:820px;
    border-radius:50%; background:${accent}; opacity:.20; filter:blur(130px);
  }
  .faces { display:flex; align-items:center; position:relative; }
  .face {
    width:150px; height:150px; border-radius:50%; object-fit:cover;
    border:5px solid ${PAGE}; box-shadow:0 0 0 3px ${accent}66;
  }
  h1 { font-size:82px; font-weight:800; letter-spacing:-.03em; line-height:1; position:relative; }
  .tag { font-size:36px; color:${MUTED}; font-weight:500; position:relative; }
  .foot {
    position:absolute; bottom:56px; left:90px; display:flex; align-items:center; gap:16px;
    font-size:27px; font-weight:700; letter-spacing:.02em; color:${accent};
  }
  .dot { width:13px; height:13px; border-radius:50%; background:${accent}; }
</style>
<div class="faces">${faces}</div>
<h1>${escapeHtml(name)}</h1>
<div class="tag">${escapeHtml(tag)}</div>
<div class="foot"><span class="dot"></span>espifam.com</div>`;
}

async function shot(html, out, w, h) {
  const tmp = path.join(os.tmpdir(), `og-${Math.random().toString(36).slice(2)}.html`);
  writeFileSync(tmp, html);
  try {
    await execFileAsync(CHROME, [
      "--headless=new", "--disable-gpu", "--hide-scrollbars", "--force-device-scale-factor=1",
      `--screenshot=${out}`, `--window-size=${w},${h}`, `file://${tmp}`,
    ]);
  } finally {
    rmSync(tmp, { force: true });
  }
  console.log(path.relative(assets, out));
}

const iconHtml = `<!doctype html><meta charset="utf-8" />
<style>*{margin:0;padding:0}html,body{width:180px;height:180px}
body{background:${PAGE};display:flex;align-items:center;justify-content:center}
img{width:132px;height:132px}</style>
<img src="file://${path.join(assets, "favicon.svg")}" />`;

rmSync(outDir, { recursive: true, force: true });
mkdirSync(outDir, { recursive: true });

await Promise.all([
  ...CARDS.map((card) => shot(cardHtml(card), path.join(outDir, `${card.slug}.png`), 1200, 630)),
  shot(iconHtml, path.join(assets, "apple-touch-icon.png"), 180, 180),
]);
