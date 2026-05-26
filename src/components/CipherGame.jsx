import Avatar from './Avatar'
import { teamOf, MAX_ROUNDS } from '../lib/cipher'

// Phase 1 of Decode: the room has been split into two teams and each team has
// drawn its 4 secret keywords. The round loop (clue writing, guessing, reveal,
// token tracking, win conditions) lands in the next phase — for now this
// confirms that team assignment + per-team secrets are working end-to-end.

// Team colour token. Used for the badge, hero ring, keyword cards.
const TEAM_THEME = {
  A: {
    label: 'Team A',
    accent: 'text-sky-300',
    ring: 'ring-sky-500',
    border: 'border-sky-500/40',
    bg: 'bg-sky-500/10',
    pillBg: 'bg-sky-500/15',
    pillBorder: 'border-sky-400/40',
  },
  B: {
    label: 'Team B',
    accent: 'text-rose-300',
    ring: 'ring-rose-500',
    border: 'border-rose-500/40',
    bg: 'bg-rose-500/10',
    pillBg: 'bg-rose-500/15',
    pillBorder: 'border-rose-400/40',
  },
}

function toArray(x) {
  if (!x) return []
  if (Array.isArray(x)) return x
  return Object.values(x)
}

function Centered({ children }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 py-12 text-center">
      {children}
    </div>
  )
}

function TeamRoster({ team, players, label, theme, highlightUid }) {
  return (
    <div className={`rounded-2xl border p-5 ${theme.border} ${theme.bg}`}>
      <p
        className={`text-xs uppercase tracking-[0.3em] font-semibold mb-3 ${theme.accent}`}
      >
        {label}
      </p>
      <ul className="space-y-2">
        {team.map((uid) => {
          const p = players[uid] || {}
          return (
            <li key={uid} className="flex items-center gap-3">
              <Avatar
                name={p.name}
                avatar={p.avatar}
                className="w-9 h-9 text-sm"
              />
              <span className="font-medium">{p.name || 'Someone'}</span>
              {uid === highlightUid && (
                <span className="ml-auto text-xs uppercase tracking-wider text-slate-500">
                  you
                </span>
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}

function CipherGame({ room, uid, onLeave }) {
  if (!room?.meta) return <Centered>Loading…</Centered>

  const cipher = room.cipher
  if (!cipher) {
    return (
      <Centered>
        <p className="text-slate-400">Setting up Decode…</p>
      </Centered>
    )
  }

  const playersMap = room.players || {}
  const mySide = teamOf(uid, cipher) // 'A' | 'B' | null (spectator)
  const myTeam = mySide === 'A' ? cipher.teamA : mySide === 'B' ? cipher.teamB : null
  const myTheme = mySide ? TEAM_THEME[mySide] : null
  const round = cipher.round || 1
  const teamAPlayers = toArray(cipher.teamA?.players)
  const teamBPlayers = toArray(cipher.teamB?.players)
  const myKeywords = toArray(myTeam?.keywords)

  return (
    <div className="min-h-screen flex flex-col items-center px-6 py-12">
      <div className="w-full max-w-2xl">
        <button
          onClick={onLeave}
          className="text-slate-500 hover:text-slate-300 text-sm mb-6 transition"
        >
          ← Leave game
        </button>

        <div className="flex items-center justify-between mb-8">
          <p className="text-xs uppercase tracking-[0.4em] text-sky-400 font-semibold">
            Decode
          </p>
          <p className="text-xs uppercase tracking-wider text-slate-500">
            Round {round} / {MAX_ROUNDS}
          </p>
        </div>

        {mySide ? (
          <>
            <div className="text-center mb-8">
              <p className="text-slate-400 text-sm uppercase tracking-wider mb-2">
                You're on
              </p>
              <p className={`text-5xl sm:text-6xl font-black ${myTheme.accent}`}>
                {myTheme.label}
              </p>
            </div>

            {/* Your team's secret keywords — visible only to your team. */}
            <div
              className={`rounded-2xl border p-6 mb-6 ${myTheme.border} ${myTheme.bg}`}
            >
              <p
                className={`text-xs uppercase tracking-[0.3em] font-semibold mb-4 ${myTheme.accent}`}
              >
                Your team's keywords — don't say them aloud
              </p>
              <ol className="grid grid-cols-2 gap-3">
                {myKeywords.map((kw, i) => (
                  <li
                    key={i}
                    className={`rounded-xl border ${myTheme.pillBorder} ${myTheme.pillBg} px-4 py-3 flex items-center gap-3`}
                  >
                    <span
                      className={`text-2xl font-black tabular-nums ${myTheme.accent}`}
                    >
                      {i + 1}
                    </span>
                    <span className="text-lg font-semibold">{kw}</span>
                  </li>
                ))}
              </ol>
            </div>
          </>
        ) : (
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6 mb-6 text-center">
            <p className="text-slate-400">
              You're not on a team in this game — sit back and watch.
            </p>
          </div>
        )}

        <div className="grid sm:grid-cols-2 gap-3 mb-8">
          <TeamRoster
            team={teamAPlayers}
            players={playersMap}
            label="Team A"
            theme={TEAM_THEME.A}
            highlightUid={uid}
          />
          <TeamRoster
            team={teamBPlayers}
            players={playersMap}
            label="Team B"
            theme={TEAM_THEME.B}
            highlightUid={uid}
          />
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6 text-center">
          <p className="text-xs uppercase tracking-[0.3em] text-slate-500 mb-2">
            Coming next
          </p>
          <p className="text-slate-300">
            Clue writing, guessing, and intercept tracking are wired up in the
            next update. For now, this confirms your team and secret keywords
            are visible only to your side.
          </p>
        </div>
      </div>
    </div>
  )
}

export default CipherGame
