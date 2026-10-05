#!/usr/bin/env node
// Raw-literal guard for the styling card: the listed pages, shared primitives and
// auth pages must take colour/type/spacing from src/styles/tokens.css only.
// Exits 1 when a raw hex or rgb()/rgba() literal appears in any guarded file.
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const guardedDirs = [
  'src/app/features',
  'src/app/landing',
  'src/app/login',
  'src/app/signup',
  'src/app/forgot-password',
  'src/app/reset-password',
];
const guardedFiles = ['src/styles/primitives.css'];

const walk = (dir) => readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
  e.isDirectory() ? walk(join(dir, e.name)) : [join(dir, e.name)]);

const files = [
  ...guardedDirs.map((d) => join(root, d)).filter(existsSync).flatMap(walk)
    .filter((f) => /\.(ts|css|scss|html)$/.test(f) && !/\.spec\.ts$/.test(f)),
  ...guardedFiles.map((f) => join(root, f)).filter(existsSync),
];

// Hex colours inside CSS/style contexts; rgb()/rgba() with a numeric first channel.
const RAW = /(?<![\w&])#[0-9a-fA-F]{3}(?:[0-9a-fA-F]{1,5})?\b(?![\w-])|rgba?\(\s*\d/g;
let failures = 0;
for (const file of files) {
  const lines = readFileSync(file, 'utf8').split('\n');
  lines.forEach((line, i) => {
    // Ignore SVG/HTML attributes (stroke="...") and URL fragments; we only police CSS values.
    const css = line.replace(/\b(?:href|routerLink|fragment|id)\s*=\s*"[^"]*"/g, '');
    const hits = css.match(RAW);
    if (hits) {
      failures++;
      console.error(`${file.slice(root.length + 1)}:${i + 1}: raw literal ${hits.join(', ')}`);
    }
  });
}
if (failures) {
  console.error(`check-style-tokens: ${failures} raw literal(s) — use var(--...) tokens from src/styles/tokens.css`);
  process.exit(1);
}
console.log(`check-style-tokens: ${files.length} file(s) clean`);
