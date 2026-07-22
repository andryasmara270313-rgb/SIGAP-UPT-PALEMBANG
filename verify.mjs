import { readdir, readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const required = [
  'server.mjs',
  'public/login.html',
  'snapshot/pages/dashboard/index.html',
  'snapshot/route-data/dashboard/__data.json',
  'snapshot/_app/immutable/entry/app.CUth0Okl.js',
  'snapshot/_app/immutable/entry/start.nYT5fiYT.js',
  'snapshot/_app/immutable/assets/maplibre-gl.B2k4QVOw.css'
];

for (const relative of required) {
  const info = await stat(path.join(root, relative));
  if (!info.isFile() || info.size === 0) throw new Error(`Missing required file: ${relative}`);
}

async function filesBelow(directory) {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await filesBelow(target));
    else if (entry.isFile()) files.push(target);
  }
  return files;
}

const forbidden = [
  /[0-9a-fA-F]{32}:[0-9a-fA-F]{64}/,
  /0suyWHwJau0rNgZX3WOo/,
  /regime-larger-beings-score\.trycloudflare\.com/
];

for (const file of await filesBelow(path.join(root, 'snapshot'))) {
  if (!/\.(?:html|js|json|txt)$/i.test(file)) continue;
  const content = await readFile(file, 'utf8');
  for (const pattern of forbidden) {
    if (pattern.test(content)) throw new Error(`Sensitive value remains in ${path.relative(root, file)}`);
  }
}

const buildRoot = path.join(root, 'snapshot', '_app');
const missingDependencies = new Set();
for (const file of await filesBelow(buildRoot)) {
  if (!/\.(?:html|js|css)$/i.test(file)) continue;
  const content = await readFile(file, 'utf8');
  const references = content.matchAll(/["'`]((?:\.\.\/|\.\/)[^"'`?#]+\.(?:css|gif|jpe?g|js|json|png|svg|webp|woff2?))["'`]/gi);
  for (const match of references) {
    const reference = match[1];
    if (reference.includes('${')) continue;
    const target = path.resolve(path.dirname(file), reference);
    try {
      const info = await stat(target);
      if (!info.isFile()) throw new Error('Not a file');
    } catch {
      missingDependencies.add(`${path.relative(buildRoot, target)} (referenced by ${path.relative(root, file)})`);
    }
  }
}

if (missingDependencies.size) {
  throw new Error(`Missing build dependencies:\n${[...missingDependencies].sort().join('\n')}`);
}

console.log('Verification passed: required files and build dependencies exist, and known credential material is absent.');
