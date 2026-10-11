/**
 * Cross-platform copy of `public/` into `dist/public/`.
 *
 * Replaces the previous shell `cp ... || xcopy ...` onSuccess hook, which
 * broke on Windows cmd (the `cp` fallback and `2>/dev/null` redirect are
 * POSIX-only). Uses per-file copyFileSync, which is reliable on Windows
 * (recursive cpSync can crash on paths containing non-ASCII characters).
 */
const fs = require("fs");
const path = require("path");

const srcDir = path.join(__dirname, "..", "public");
const outDir = path.join(__dirname, "..", "dist", "public");

fs.mkdirSync(outDir, { recursive: true });

for (const file of fs.readdirSync(srcDir)) {
  fs.copyFileSync(path.join(srcDir, file), path.join(outDir, file));
}

console.log(`copied ${fs.readdirSync(srcDir).length} file(s) to dist/public`);
