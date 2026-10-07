const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const out = path.join(root, "js", "bundle.js");
const SKIP_DIRS = new Set(["tools", ".git", "node_modules"]);
const SKIP_FILES = new Set(["js/bundle.js"]);

function walk(dir, list) {
  for (const name of fs.readdirSync(dir).sort()) {
    if (SKIP_DIRS.has(name)) continue;
    const full = path.join(dir, name);
    const rel = path.relative(root, full).split(path.sep).join("/");
    if (SKIP_FILES.has(rel)) continue;
    const st = fs.statSync(full);
    if (st.isDirectory()) walk(full, list);
    else list.push(rel);
  }
  return list;
}

const files = walk(root, []);
const parts = ["const FILE_BUNDLE = {"];
for (const rel of files) {
  const buf = fs.readFileSync(path.join(root, rel));
  const isText = /\.(html|css|js|md|txt|svg)$/i.test(rel);
  if (isText) {
    parts.push("  " + JSON.stringify(rel) + ': { t: "t", d: ' + JSON.stringify(buf.toString("utf8")) + " },");
  } else {
    parts.push("  " + JSON.stringify(rel) + ': { t: "b", d: "' + buf.toString("base64") + '" },');
  }
}
parts.push("};");
fs.writeFileSync(out, parts.join("\n") + "\n");

let total = 0;
for (const rel of files) total += fs.statSync(path.join(root, rel)).size;
console.log(files.length + " files, " + (total / 1024).toFixed(1) + " KB source, bundle " + (fs.statSync(out).size / 1024).toFixed(1) + " KB");