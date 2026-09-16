import Avatar from './Avatar'
import CipherClueWriter from './CipherClueWriter'
import CipherGuessing from './CipherGuessing'
import CipherReveal from './CipherReveal'
import CipherScoreboard from './CipherScoreboard'
import useCipherHostLoop from '../hooks/useCipherHostLoop'
import { Screen, Panel, Label, BackLink } from './ui'
import {
  submitCipherClues,
  updateCipherGuess,
  lockCipherOwnGuess,
  lockCipherGuess,
} from '../lib/rooms'
import {
  teamOf,
  toArr,
  MAX_ROUNDS,
  WIN_INTERCEPTS,
  LOSE_MISCOMS,
} from '../lib/cipher'

// Team colour tokens — the canonical cyberpunk pair, cyan for A and magenta for
// B. Maximally far apart so spectators never confuse teams at a glance, and
// both already live in the palette. `frame`/`face` feed the chamfered panels.
const THEME_A = {
  team: 'A',
  label: 'Team A',
  accent: 'text-cyan',
  frame: 'bg-cyan',
  face: 'bg-cyan/8',
  pillBorder: 'border-cyan/45',
  pillBg: 'bg-cyan/15',
  dot: 'bg-cyan',
}
const THEME_B = {
  team: 'B',
  label: 'Team B',
  accent: 'text-neon',
  frame: 'bg-neon',
  face: 'bg-neon/8',
  pillBorder: 'border-neon/45',
  pillBg: 'bg-neon/15',
  dot: 'bg-neon',
}

function Centered({ children }) {
  return (
    <Screen width="max-w-md" className="text-center">
      {children}
    </Screen>
  )
}

// Two-team token scoreboard always shown at the top of the round.
function TokenHeader({ cipher, themeA, themeB }) {
  const a = cipher.teamA || {}
  const b = cipher.teamB || {}
  return (
    <div className="mb-4 grid grid-cols-2 gap-3">
      <TeamTokens label="Team A" theme={themeA} state={a} />
      <TeamTokens label="Team B" theme={themeB} state={b} />
    </div>
  )
}

function TeamTokens({ label, theme, state }) {
  const intercepts = state.intercepts || 0
  const miscoms = state.miscoms || 0
  return (
    <div data-team={theme.team} className={`cut-frame cut-sm ${theme.frame}`}>
      <div className={`cut-face p-3 ${theme.face}`}>
        <p className={`hud mb-2.5 text-[0.62rem] ${theme.accent}`}>{label}</p>
        <div className="flex flex-col gap-1.5">
          <TokenRow
            label="intercepts"
            filled={intercepts}
            max={WIN_INTERCEPTS}
            tone="bg-lime"
          />
          <TokenRow
            label="miscoms"
            filled={miscoms}
            max={LOSE_MISCOMS}
            tone="bg-rose"
          />
        </div>
      </div>
    </div>
  )
}

function TokenRow({ label, filled, max, tone }) {
  return (
    <div className="flex items-center gap-2">
      <span className="flex gap-1">
        {Array.from({ length: max }).map((_, i) => (
          <span
            key={i}
            style={{ '--cut': '3px' }}
            className={`cut h-3 w-3 ${
              i < filled ? tone : 'bg-surface-3'
            }`}
          />
        ))}
      </span>
      <span className="hud text-[0.55rem] text-faint">
        {label} {filled}/{max}
      </span>
    </div>
  )
}

// Always-visible keyword panel for your own team (your reference all game).
function MyKeywords({ keywords, theme }) {
  if (!keywords?.length) return null
  return (
    <div data-team={theme.team} className={`cut-frame mb-4 ${theme.frame}`}>
      <div className={`cut-face p-4 ${theme.face}`}>
        <p className={`hud mb-3 text-[0.62rem] ${theme.accent}`}>
          your keywords
        </p>
        <ol className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {keywords.map((kw, i) => (
            <li
              key={i}
              style={{ '--cut': '7px' }}
              className={`cut flex items-center gap-2 border px-3 py-2 ${theme.pillBorder} ${theme.pillBg}`}
            >
              <span className={`hud text-base tabular-nums ${theme.accent}`}>
                {i + 1}
              </span>
              <span className="min-w-0 truncate font-semibold">{kw}</span>
            </li>
          ))}
        </ol>
      </div>
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
      <Label className="mb-2">prior rounds · pattern hunting</Label>
      <div className="space-y-3">
        {entries.map(({ n, data }) => (
          <Panel key={n} sm bodyClassName="p-3">
            <p className="hud mb-2 text-[0.58rem] text-faint">round {n}</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <HistoryTeam
                label="Team A"
                theme={themeA}
                clues={data.clues?.A}
                code={data.codes?.A}
              />
              <HistoryTeam
                label="Team B"
                theme={themeB}
                clues={data.clues?.B}
                code={data.codes?.B}
              />
            </div>
          </Panel>
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
      <p className={`hud mb-1.5 text-[0.58rem] ${theme.accent}`}>
        {label} · code {codeArr.join('-')}
      </p>
      <ol className="space-y-0.5">
        {clueArr.map((c, i) => (
          <li key={i} className="flex gap-2 text-sm">
            <span className={`hud tabular-nums ${theme.accent}`}>
              {codeArr[i]}
            </span>
            <span className="min-w-0 text-muted">{c}</span>
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
        <p className="text-muted">Setting up Decode…</p>
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
      <div data-game="cipher">
        <CipherScoreboard
          cipher={cipher}
          playersMap={playersMap}
          themeA={THEME_A}
          themeB={THEME_B}
          onLeave={onLeave}
        />
      </div>
    )
  }

  // ---- In-round shell (header + keywords + phase body) -------------------
  return (
    // data-game retints all the generic chrome (buttons, fields, ticks) to cyan.
    <div data-game="cipher">
      <Screen center={false}>
        <BackLink onClick={onLeave}>← leave game</BackLink>

        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="animate-blink h-1.5 w-1.5 accent-bg" />
            <span className="hud text-[0.68rem] accent-text">decode</span>
          </div>
          <span className="hud text-[0.62rem] text-faint">
            round {round}/{MAX_ROUNDS}
          </span>
        </div>

        <TokenHeader cipher={cipher} themeA={THEME_A} themeB={THEME_B} />

        {mySide && <MyKeywords keywords={toArr(myTeam?.keywords)} theme={myTheme} />}

        {!mySide && (
          <Panel sm className="mb-4" bodyClassName="p-4 text-center">
            <p className="text-sm text-muted">
              You&apos;re not on a team in this game — sit back and watch.
            </p>
          </Panel>
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
            round={round}
            myUid={uid}
            themeA={THEME_A}
            themeB={THEME_B}
            onUpdateGuess={(own, opp) =>
              updateCipherGuess(code, round, mySide, own, opp)
            }
            onLockOwn={() => lockCipherOwnGuess(code, round, mySide)}
            onLockGuess={() => lockCipherGuess(code, round, mySide)}
          />
        )}

        {status === 'cipher-reveal' && (
          <CipherReveal
            currentRound={currentRound}
            round={round}
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
        <div className="mt-8 grid grid-cols-2 gap-3">
          <Roster
            label="Team A"
            theme={THEME_A}
            uids={toArr(cipher.teamA?.players)}
            playersMap={playersMap}
            highlightUid={uid}
          />
          <Roster
            label="Team B"
            theme={THEME_B}
            uids={toArr(cipher.teamB?.players)}
            playersMap={playersMap}
            highlightUid={uid}
          />
        </div>
      </Screen>
    </div>
  )
}

function Roster({ label, theme, uids, playersMap, highlightUid }) {
  return (
    <Panel sm bodyClassName="p-3">
      <p className={`hud mb-2 text-[0.58rem] ${theme.accent}`}>{label}</p>
      <ul className="space-y-1.5">
        {uids.map((u) => {
          const p = playersMap[u] || {}
          return (
            <li key={u} className="flex items-center gap-2">
              <Avatar name={p.name} avatar={p.avatar} className="w-6 h-6 text-xs" />
              <span className="min-w-0 truncate text-sm">
                {p.name || 'Someone'}
              </span>
              {u === highlightUid && (
                <span className="hud ml-auto text-[0.55rem] text-faint">you</span>
              )}
            </li>
          )
        })}
      </ul>
    </Panel>
  )
}

export default CipherGame
