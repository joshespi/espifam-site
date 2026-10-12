// Local dev: serves public/ on http://localhost:8085, keeps Tailwind in watch
// mode, and re-copies src/ into public/ in-process whenever something changes.
// Rebuilds never delete from public/, so it starts clean; restart dev after
// renaming or removing a page to drop the stale copy.
import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { watch, mkdirSync, rmSync } from "node:fs";
import { spawn } from "node:child_process";
import path from "node:path";
import { root, src, dest as pub, copySrc } from "./copy-src.mjs";

const PORT = Number(process.env.PORT) || 8085;

const TYPES = {
  ".html": "text/html; charset=utf-8", ".css": "text/css", ".js": "text/javascript",
  ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg", ".webp": "image/webp",
  ".json": "application/json", ".xml": "application/xml", ".txt": "text/plain; charset=utf-8",
  ".ico": "image/x-icon",
};

rmSync(pub, { recursive: true, force: true });
mkdirSync(pub, { recursive: true });
spawn("npm run build:css -- --watch=always", {
  cwd: root, stdio: "inherit", shell: true,
}).on("exit", (code) => console.error(`tailwind exited (${code}); CSS is no longer rebuilding`));

// Nothing is cached in dev, so skip hashing styles.css for the ?v= stamp.
function copy() {
  try { copySrc({ cssVersion: "dev" }); } catch (e) { console.error(e); }
}

let timer;
watch(src, { recursive: true }, (_, name) => {
  if (name?.startsWith("styles")) return; // Tailwind's watcher handles CSS
  clearTimeout(timer);
  timer = setTimeout(copy, 100);
});
copy();

async function resolve(urlPath) {
  const clean = path.normalize(decodeURIComponent(urlPath)).replace(/^[/\\]+/, "");
  let file = path.join(pub, clean);
  if (file !== pub && !file.startsWith(pub + path.sep)) return null;
  try {
    if ((await stat(file)).isDirectory()) file = path.join(file, "index.html");
    return { file, data: await readFile(file) };
  } catch {
    return null;
  }
}

createServer(async (req, res) => {
  const { pathname } = new URL(req.url, "http://localhost");
  const hit = await resolve(pathname);
  if (hit) {
    res.writeHead(200, { "Content-Type": TYPES[path.extname(hit.file)] ?? "application/octet-stream" });
    return res.end(hit.data);
  }
  const notFound = await resolve("/404.html");
  res.writeHead(404, { "Content-Type": "text/html; charset=utf-8" });
  res.end(notFound?.data ?? "Not found");
}).listen(PORT, "127.0.0.1", () => console.log(`dev server: http://localhost:${PORT}`));
