import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const distDir = path.resolve(__dirname, 'dist');
if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir, { recursive: true });
}

// 1. Copy manifest.json
fs.copyFileSync(
  path.resolve(__dirname, 'manifest.json'),
  path.resolve(distDir, 'manifest.json')
);
console.log('Copied manifest.json to dist/');

// 2. Copy icons directory if it exists
const srcIcons = path.resolve(__dirname, 'icons');
const distIcons = path.resolve(distDir, 'icons');
if (fs.existsSync(srcIcons)) {
  if (!fs.existsSync(distIcons)) {
    fs.mkdirSync(distIcons, { recursive: true });
  }
  const files = fs.readdirSync(srcIcons);
  for (const file of files) {
    fs.copyFileSync(path.join(srcIcons, file), path.join(distIcons, file));
  }
  console.log(`Copied ${files.length} icon(s) to dist/icons/`);
}

