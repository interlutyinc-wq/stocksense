import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..", "..");
const htmlPath = path.join(root, "index.html");
const outPath = path.join(__dirname, "..", "app", "marketing", "marketing.css");

const html = fs.readFileSync(htmlPath, "utf8");
const m = html.match(/<style>([\s\S]*?)<\/style>/);
if (!m) throw new Error("No <style> in index.html");
let css = m[1];

css = css.replace(/:root\s*\{/, ".marketing-page {");
css = css.replace(
  /\*\s*\{[^}]+\}/,
  ".marketing-page, .marketing-page * { margin:0;padding:0;box-sizing:border-box; }",
);
css = css.replace(/html\s*\{[^}]+\}\s*/g, "");
css = css.replace(/^\s*body\s*\{[^}]+\}\s*/m, "");
css = css.replace(/#cur\b/g, ".marketing-page .mk-cur");
css = css.replace(/#ring\b/g, ".marketing-page .mk-ring");

const lines = css.split("\n");
const out = lines
  .map((line) => {
    const t = line.trimStart();
    if (!t || t.startsWith("/*") || t.startsWith("*")) return line;
    if (t.startsWith("@")) return line;
    if (t.startsWith(".marketing-page")) return line;
    const indent = line.match(/^\s*/)[0];
    if (/^\s+[.#\[:a-zA-Z]/.test(line) && t.includes("{")) {
      return indent + ".marketing-page " + t;
    }
    return line;
  })
  .join("\n");

fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(
  outPath,
  "/* Auto-generated from repo index.html — scoped */\n" + out,
);
console.log("Wrote", outPath, out.length);
