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
            style={{ '--cut': '18%' }}
            className={`cut-frame relative aspect-square transition ${
              selected
                ? 'bg-[var(--accent)] shadow-[var(--accent-glow)]'
                : locked
                  ? 'bg-line cursor-not-allowed'
                  : 'bg-line hover:bg-line-bright hover:-translate-y-0.5'
            }`}
          >
            <span className="cut-face relative block h-full w-full overflow-hidden bg-surface">
              <img
                src={a.url}
                alt={a.id}
                decoding="async"
                className={`h-full w-full object-cover transition ${
                  locked ? 'grayscale opacity-20' : selected ? '' : 'opacity-75'
                }`}
              />
              {locked && (
                <span className="hud absolute inset-0 flex items-center justify-center text-[0.6rem] text-faint">
                  taken
                </span>
              )}
            </span>
          </button>
        )
      })}
    </div>
  )
}

export default AvatarPicker
