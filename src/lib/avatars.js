// Auto-discovers every image in src/assets/avatars/ at build time. Drop a new
// file in that folder and Vite picks it up on next reload — no manifest edit
// needed. The filename (minus extension, lowercased) becomes the avatar id we
// store in RTDB, so renaming a file breaks references to it.
const modules = import.meta.glob(
  '../assets/avatars/*.{png,jpg,jpeg,webp,svg}',
  { eager: true }
)

const avatars = Object.entries(modules)
  .map(([path, mod]) => {
    const file = path.split('/').pop()
    const id = file.replace(/\.[^.]+$/, '').toLowerCase()
    return { id, url: mod.default }
  })
  .sort((a, b) => a.id.localeCompare(b.id))

export default avatars

export function getAvatarUrl(id) {
  if (!id) return null
  return avatars.find((a) => a.id === id)?.url || null
}
