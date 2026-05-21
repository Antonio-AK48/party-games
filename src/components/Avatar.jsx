import { getAvatarUrl } from '../lib/avatars'

function Avatar({ name, avatar, className = 'w-9 h-9 text-base' }) {
  const url = avatar ? getAvatarUrl(avatar) : null
  return (
    <div
      className={`${className} rounded-full bg-purple-600 flex items-center justify-center font-semibold overflow-hidden shrink-0`}
    >
      {url ? (
        <img src={url} alt={name} className="w-full h-full object-cover" />
      ) : (
        name?.[0]?.toUpperCase() || '?'
      )}
    </div>
  )
}

export default Avatar
