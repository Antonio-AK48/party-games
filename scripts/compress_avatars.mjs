// Compress avatar PNGs to WebP for much smaller transfer sizes.
//
// The crop script (crop_avatars.py) writes verbose 512×512 PNGs that come in
// around 330–470KB each — fine for source-of-truth, but a lot to ship every
// time a player loads the lobby. WebP at quality 85 drops them ~80–90% with no
// visible difference on these portrait avatars.
//
// Reads every *.png in src/assets/avatars/, writes a same-named *.webp, and
// deletes the original. The Vite glob in lib/avatars.js already includes .webp,
// so nothing else needs to change. Run after editing the avatar set:
//   npm run compress-avatars
import sharp from 'sharp'
import { readdir, stat, unlink } from 'node:fs/promises'
import { join, basename, extname, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const DIR = join(__dirname, '..', 'src', 'assets', 'avatars')
const QUALITY = 85

const files = (await readdir(DIR)).filter((f) => f.toLowerCase().endsWith('.png'))
if (files.length === 0) {
  console.log('No PNG avatars to compress.')
  process.exit(0)
}

let totalBefore = 0
let totalAfter = 0
for (const f of files) {
  const src = join(DIR, f)
  const dest = join(DIR, basename(f, extname(f)) + '.webp')
  const before = (await stat(src)).size
  await sharp(src).webp({ quality: QUALITY, effort: 6 }).toFile(dest)
  const after = (await stat(dest)).size
  await unlink(src)
  totalBefore += before
  totalAfter += after
  const pct = Math.round((1 - after / before) * 100)
  console.log(
    `${f.padEnd(20)} ${(before / 1024).toFixed(0).padStart(4)}KB -> ${(after / 1024).toFixed(0).padStart(4)}KB  (-${pct}%)`
  )
}
console.log(
  `\nTotal: ${(totalBefore / 1024).toFixed(0)}KB -> ${(totalAfter / 1024).toFixed(0)}KB  (-${Math.round((1 - totalAfter / totalBefore) * 100)}%)`
)
