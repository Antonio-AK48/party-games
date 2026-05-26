import Avatar from './Avatar'
import CipherClueWriter from './CipherClueWriter'
import CipherGuessing from './CipherGuessing'
import CipherReveal from './CipherReveal'
import CipherScoreboard from './CipherScoreboard'
import useCipherHostLoop from '../hooks/useCipherHostLoop'
import {
  submitCipherClues,
  updateCipherGuess,
  lockCipherGuess,
} from '../lib/rooms'
import {
  teamOf,
  toArr,
  MAX_ROUNDS,
  WIN_INTERCEPTS,
  LOSE_MISCOMS,
} from '../lib/cipher'

// Team colour tokens — sky for A, rose for B (visually far apart so spectators
// don't confuse teams at a glance).
const THEME_A = {
  label: 'Team A',
  accent: 'text-sky-300',
  ring: 'ring-sky-500',
  border: 'border-sky-500/40',
  bg: 'bg-sky-500/10',
  pillBg: 'bg-sky-500/15',
  pillBorder: 'border-sky-400/40',
}
const THEME_B = {
  label: 'Team B',
  accent: 'text-rose-300',
  ring: 'ring-rose-500',
  border: 'border-rose-500/40',
  bg: 'bg-rose-500/10',
  pillBg: 'bg-rose-500/15',
  pillBorder: 'border-rose-400/40',
}

function Centered({ children }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 py-12 text-center">
      {children}
    </div>
  )
}

// Two-team token scoreboard always shown at the top of the round.
function TokenHeader({ cipher, themeA, themeB }) {
  const a = cipher.teamA || {}
  const b = cipher.teamB || {}
  return (
    <div className="grid grid-cols-2 gap-3 mb-5">
      <TeamTokens label="Team A" theme={themeA} state={a} />
      <TeamTokens label="Team B" theme={themeB} state={b} />
    </div>
  )
}

function TeamTokens({ label, theme, state }) {
  const intercepts = state.intercepts || 0
  const miscoms = state.miscoms || 0
  return (
    <div className={`rounded-xl border p-3 ${theme.border} ${theme.bg}`}>
      <p className={`text-xs uppercase tracking-[0.3em] font-semibold mb-2 ${theme.accent}`}>
        {label}
      </p>
      <div className="flex items-center gap-3 text-sm">
        <span className="flex items-center gap-1">
          <Pip filled={intercepts >= 1} tone="emerald" />
          <Pip filled={intercepts >= 2} tone="emerald" />
          <span className="text-slate-500 ml-1">intercepts ({intercepts}/{WIN_INTERCEPTS})</span>
        </span>
        <span className="flex items-center gap-1">
          <Pip filled={miscoms >= 1} tone="rose" />
          <Pip filled={miscoms >= 2} tone="rose" />
          <span className="text-slate-500 ml-1">miscoms ({miscoms}/{LOSE_MISCOMS})</span>
        </span>
      </div>
    </div>
  )
}

function Pip({ filled, tone }) {
  const filledClass =
    tone === 'emerald' ? 'bg-emerald-400 border-emerald-400' : 'bg-rose-400 border-rose-400'
  return (
    <span
      className={`w-3 h-3 rounded-full border ${
        filled ? filledClass : 'border-slate-700'
      }`}
    />
  )
}

// Always-visible keyword panel for your own team (your reference all game).
function MyKeywords({ keywords, theme }) {
  if (!keywords?.length) return null
  return (
    <div className={`rounded-2xl border p-4 mb-5 ${theme.border} ${theme.bg}`}>
      <p className={`text-xs uppercase tracking-[0.3em] font-semibold mb-3 ${theme.accent}`}>
        Your keywords
      </p>
      <ol className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {keywords.map((kw, i) => (
          <li
            key={i}
            className={`rounded-lg border ${theme.pillBorder} ${theme.pillBg} px-3 py-2 flex items-center gap-2`}
          >
            <span className={`text-lg font-black tabular-nums ${theme.accent}`}>
              {i + 1}
            </span>
            <span className="font-medium">{kw}</span>
          </li>
        ))}
      </ol>
    </div>
  )
}

// Past rounds (clues + revealed codes). Useful for intercepting in later rounds.
function CipherHistory({ rounds, currentRound, themeA, themeB }) {
  // Show all rounds STRICTLY BEFORE the current round (those have results).
  const entries = []
  Object.entries(rounds || {}).forEach(([k, v]) => {
    const n = Number(k)
    if (!Number.isFinite(n)) return
    if (n >= currentRound) return
    if (!v?.codes || !v?.clues) return
    entries.push({ n, data: v })
  })
  entries.sort((a, b) => a.n - b.n)
  if (entries.length === 0) return null
  return (
    <div className="mt-8">
      <p className="text-xs uppercase tracking-[0.3em] text-slate-500 font-semibold mb-2">
        Prior rounds (for pattern hunting)
      </p>
      <div className="space-y-3">
        {entries.map(({ n, data }) => (
          <div
            key={n}
            className="rounded-xl border border-slate-800 bg-slate-900/50 p-3 text-sm"
          >
            <p className="text-slate-500 text-xs uppercase tracking-wider mb-2">
              Round {n}
            </p>
            <div className="grid sm:grid-cols-2 gap-3">
              <HistoryTeam label="Team A" theme={themeA} clues={data.clues?.A} code={data.codes?.A} />
              <HistoryTeam label="Team B" theme={themeB} clues={data.clues?.B} code={data.codes?.B} />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function HistoryTeam({ label, theme, clues, code }) {
  const clueArr = toArr(clues)
  const codeArr = toArr(code)
  return (
    <div>
      <p className={`text-xs uppercase tracking-wider font-semibold mb-1 ${theme.accent}`}>
        {label} · code {codeArr.join('-')}
      </p>
      <ol className="space-y-0.5">
        {clueArr.map((c, i) => (
          <li key={i} className="text-slate-300">
            <span className={`tabular-nums font-bold ${theme.accent}`}>
              {codeArr[i]}
            </span>{' '}
            <span className="text-slate-200">{c}</span>
          </li>
        ))}
      </ol>
    </div>
  )
}

function CipherGame({ room, code, uid, isHost, onLeave }) {
  // Host pump runs only when isHost && room exists.
  useCipherHostLoop({ room, code, isHost })

  if (!room?.meta) return <Centered>Loading…</Centered>

  const status = room.meta.status
  const cipher = room.cipher
  if (!cipher) {
    return (
      <Centered>
        <p className="text-slate-400">Setting up Decode…</p>
      </Centered>
    )
  }

  const playersMap = room.players || {}
  const mySide = teamOf(uid, cipher) // 'A' | 'B' | null
  const myTeam = mySide === 'A' ? cipher.teamA : mySide === 'B' ? cipher.teamB : null
  const myTheme = mySide === 'A' ? THEME_A : mySide === 'B' ? THEME_B : null
  const round = cipher.round || room.meta.round || 1
  const currentRound = cipher.rounds?.[round] || {}

  // Resolve the OTHER team's encryptor for "waiting for X" messages.
  const oppEncryptorUid =
    mySide === 'A' ? currentRound.encryptors?.B : currentRound.encryptors?.A
  const oppEncryptorName = playersMap[oppEncryptorUid]?.name || 'them'

  // ---- Final scoreboard --------------------------------------------------
  if (status === 'cipher-scoreboard') {
    return (
      <CipherScoreboard
        cipher={cipher}
        playersMap={playersMap}
        themeA={THEME_A}
        themeB={THEME_B}
        onLeave={onLeave}
      />
    )
  }

  // ---- In-round shell (header + keywords + phase body) -------------------
  return (
    <div className="min-h-screen flex flex-col items-center px-6 py-12">
      <div className="w-full max-w-2xl">
        <button
          onClick={onLeave}
          className="text-slate-500 hover:text-slate-300 text-sm mb-4 transition"
        >
          ← Leave game
        </button>

        <div className="flex items-center justify-between mb-5">
          <p className="text-xs uppercase tracking-[0.4em] text-sky-400 font-semibold">
            Decode
          </p>
          <p className="text-xs uppercase tracking-wider text-slate-500">
            Round {round} / {MAX_ROUNDS}
          </p>
        </div>

        <TokenHeader cipher={cipher} themeA={THEME_A} themeB={THEME_B} />

        {mySide && <MyKeywords keywords={toArr(myTeam?.keywords)} theme={myTheme} />}

        {!mySide && (
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4 mb-5 text-center text-sm text-slate-400">
            You're not on a team in this game — sit back and watch.
          </div>
        )}

        {/* Phase body */}
        {(status === 'cipher-active' || status === 'cipher-clues') && (
          <CipherClueWriter
            mySide={mySide}
            myTeam={myTeam}
            opponentEncryptorName={oppEncryptorName}
            currentRound={currentRound}
            myUid={uid}
            myTheme={myTheme}
            onSubmitClues={(clues) =>
              submitCipherClues(code, round, mySide, clues)
            }
          />
        )}

        {status === 'cipher-guessing' && (
          <CipherGuessing
            mySide={mySide}
            myTeam={myTeam}
            currentRound={currentRound}
            themeA={THEME_A}
            themeB={THEME_B}
            onUpdateGuess={(own, opp) =>
              updateCipherGuess(code, round, mySide, own, opp)
            }
            onLockGuess={() => lockCipherGuess(code, round, mySide)}
          />
        )}

        {status === 'cipher-reveal' && (
          <CipherReveal
            currentRound={currentRound}
            themeA={THEME_A}
            themeB={THEME_B}
          />
        )}

        <CipherHistory
          rounds={cipher.rounds}
          currentRound={round}
          themeA={THEME_A}
          themeB={THEME_B}
        />

        {/* Roster footer */}
        <div className="grid grid-cols-2 gap-3 mt-8 text-xs">
          <Roster label="Team A" theme={THEME_A} uids={toArr(cipher.teamA?.players)} playersMap={playersMap} highlightUid={uid} />
          <Roster label="Team B" theme={THEME_B} uids={toArr(cipher.teamB?.players)} playersMap={playersMap} highlightUid={uid} />
        </div>
      </div>
    </div>
  )
}

function Roster({ label, theme, uids, playersMap, highlightUid }) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-3">
      <p className={`text-xs uppercase tracking-wider font-semibold mb-2 ${theme.accent}`}>
        {label}
      </p>
      <ul className="space-y-1">
        {uids.map((u) => {
          const p = playersMap[u] || {}
          return (
            <li key={u} className="flex items-center gap-2">
              <Avatar name={p.name} avatar={p.avatar} className="w-6 h-6 text-xs" />
              <span className="text-sm">{p.name || 'Someone'}</span>
              {u === highlightUid && (
                <span className="text-[10px] uppercase tracking-wider text-slate-500 ml-auto">
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

export default CipherGame
