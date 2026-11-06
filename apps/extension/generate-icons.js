import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const brandingDir = path.resolve(__dirname, '../../branding');
const iconsDir = path.resolve(__dirname, 'icons');

if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

[16, 32, 48, 128].forEach((size) => {
  const src = path.join(brandingDir, `icon-${size}.png`);
  const dest = path.join(iconsDir, `icon-${size}.png`);
  if (fs.existsSync(src)) {
    fs.copyFileSync(src, dest);
    console.log(`Copied brand icon-${size}.png to extension icons`);
  }
});
