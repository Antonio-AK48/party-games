import avatars from '../lib/avatars'

function AvatarPicker({ value, onChange }) {
  // Hide the picker entirely until at least one avatar image has been added.
  // This keeps the form looking clean before the user drops any files in.
  if (avatars.length === 0) return null

  return (
    <div>
      <label className="block text-sm text-slate-400 mb-2">
        Avatar <span className="text-slate-600">(optional)</span>
      </label>
      <div className="grid grid-cols-5 sm:grid-cols-6 gap-2">
        {avatars.map((a) => {
          const selected = value === a.id
          return (
            <button
              key={a.id}
              type="button"
              onClick={() => onChange(selected ? null : a.id)}
              title={a.id}
              className={`rounded-full overflow-hidden aspect-square transition ${
                selected
                  ? 'ring-2 ring-purple-500 ring-offset-2 ring-offset-slate-950'
                  : 'opacity-70 hover:opacity-100'
              }`}
            >
              <img
                src={a.url}
                alt={a.id}
                className="w-full h-full object-cover"
              />
            </button>
          )
        })}
      </div>
    </div>
  )
}

export default AvatarPicker
