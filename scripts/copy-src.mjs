// Copies src/ into public/, skipping the styles/ directory (built separately by build:css).
import { cpSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const src = path.join(root, "src");
const dest = path.join(root, "public");

cpSync(src, dest, {
  recursive: true,
  filter: (source) => {
    const rel = path.relative(src, source);
    return rel !== "styles" && rel !== "styles.css" && !rel.startsWith(`styles${path.sep}`);
  },
});
