/**
 * Run once to generate PWA icons from public/logo.png
 * Usage: node scripts/generate-icons.mjs
 *
 * Requires sharp (already installed as a Next.js dependency)
 */

import sharp from 'sharp'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')
const src = join(root, 'public', 'logo.png')

const sizes = [
  { size: 192, name: 'icon-192.png' },
  { size: 512, name: 'icon-512.png' },
  { size: 180, name: 'apple-touch-icon.png' },
]

for (const { size, name } of sizes) {
  const dest = join(root, 'public', name)
  await sharp(src)
    .resize(size, size, { fit: 'contain', background: { r: 10, g: 63, b: 58, alpha: 1 } })
    .png()
    .toFile(dest)
  console.log(`✓ Generated public/${name} (${size}×${size})`)
}

console.log('\nDone. Update manifest.json now points to icon-192.png and icon-512.png.')
