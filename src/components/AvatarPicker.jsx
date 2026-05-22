import avatars from '../lib/avatars'

// Grid of selectable avatars. `value` is the currently-highlighted id, `onChange`
// fires with the clicked id (selection is a preview — the parent decides when to
// commit). Ids in `takenIds` are locked: another player has already claimed them,
// so they're greyed out and unclickable.
function AvatarPicker({ value, onChange, takenIds = [] }) {
  // Nothing to show until at least one avatar image exists in the folder.
  if (avatars.length === 0) return null

  const taken = new Set(takenIds)

  return (
    <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
      {avatars.map((a) => {
        const selected = value === a.id
        const locked = taken.has(a.id)
        return (
          <button
            key={a.id}
            type="button"
            disabled={locked}
            onClick={() => onChange(a.id)}
            title={locked ? `${a.id} (taken)` : a.id}
            className={`relative rounded-full overflow-hidden aspect-square transition ${
              selected
                ? 'ring-4 ring-purple-500 ring-offset-2 ring-offset-slate-950'
                : locked
                  ? 'cursor-not-allowed'
                  : 'opacity-80 hover:opacity-100 hover:scale-105'
            }`}
          >
            <img
              src={a.url}
              alt={a.id}
              className={`w-full h-full object-cover ${
                locked ? 'grayscale opacity-25' : ''
              }`}
            />
            {locked && (
              <span className="absolute inset-0 flex items-center justify-center text-3xl">
                🔒
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}

export default AvatarPicker
