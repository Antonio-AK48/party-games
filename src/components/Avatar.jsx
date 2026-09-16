import { getAvatarUrl } from '../lib/avatars'

// Chamfered rather than round, to match the panel language. The cut scales with
// the avatar via --cut so a 7px thumbnail and a 160px hero both look right.
function Avatar({ name, avatar, className = 'w-9 h-9 text-base', cut = '22%' }) {
  const url = avatar ? getAvatarUrl(avatar) : null
  return (
    <div
      style={{ '--cut': cut }}
      className={`${className} cut bg-[var(--accent)] flex items-center justify-center font-bold text-ink overflow-hidden shrink-0`}
    >
      {url ? (
        <img
          src={url}
          alt={name}
          loading="lazy"
          decoding="async"
          className="w-full h-full object-cover"
        />
      ) : (
        name?.[0]?.toUpperCase() || '?'
      )}
    </div>
  )
}

export default Avatar
