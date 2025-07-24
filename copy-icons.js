import { existsSync, mkdirSync, copyFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const publicDir = join(__dirname, 'public');
const iconsDir = join(publicDir, 'icons');

// Create icons directory if it doesn't exist
if (!existsSync(iconsDir)) {
  mkdirSync(iconsDir, { recursive: true });
}

// Copy and rename the icon files
const icons = [
  { from: 'android-chrome-192x192.png', to: 'icon-192.png' },
  { from: 'android-chrome-512x512.png', to: 'icon-512.png' }
];

let copiedFiles = 0;

icons.forEach(({ from, to }) => {
  const source = join(publicDir, from);
  const dest = join(iconsDir, to);
  
  if (existsSync(source) && !existsSync(dest)) {
    copyFileSync(source, dest);
    console.log(`✅ Copied ${from} to ${dest}`);
    copiedFiles++;
  } else if (!existsSync(source)) {
    console.warn(`⚠️  Source file not found: ${source}`);
  } else {
    console.log(`ℹ️  File already exists: ${dest}`);
  }
});

if (copiedFiles === 0 && icons.length > 0) {
  console.log('ℹ️  All icon files are already in place.');
}

console.log('✅ Icons setup complete!');