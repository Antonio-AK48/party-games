import { useEffect } from 'react'
import confetti from 'canvas-confetti'
import Avatar from './Avatar'
import { toArr } from '../lib/cipher'
import { sounds } from '../lib/sound'
import { Screen, Btn, Label, Pill } from './ui'

// Phase: cipher-scoreboard. Game over — show the winning team, both rosters,
// and final intercept/miscom tallies. Confetti + fanfare for a non-tie win.
function CipherScoreboard({ cipher, playersMap, themeA, themeB, onLeave }) {
  const winner = cipher?.winner // 'A' | 'B' | 'tie'
  const winningTheme = winner === 'A' ? themeA : winner === 'B' ? themeB : null

  useEffect(() => {
    if (winner !== 'A' && winner !== 'B') return
    sounds.winner()
    confetti({ particleCount: 140, spread: 80, origin: { y: 0.4 } })
    const t = setTimeout(() => {
      confetti({ particleCount: 60, angle: 60, spread: 65, origin: { x: 0, y: 0.6 } })
      confetti({ particleCount: 60, angle: 120, spread: 65, origin: { x: 1, y: 0.6 } })
    }, 400)
    return () => clearTimeout(t)
  }, [winner])

  const teamAPlayers = toArr(cipher?.teamA?.players)
  const teamBPlayers = toArr(cipher?.teamB?.players)
  const aScore = {
    intercepts: cipher?.teamA?.intercepts || 0,
    miscoms: cipher?.teamA?.miscoms || 0,
  }
  const bScore = {
    intercepts: cipher?.teamB?.intercepts || 0,
    miscoms: cipher?.teamB?.miscoms || 0,
  }

  return (
    <Screen>
      <div className="mb-10 text-center">
        {winner === 'tie' ? (
          <>
            <Label className="mb-4">final result</Label>
            <h2 className="display neon text-4xl sm:text-6xl">It&apos;s a tie</h2>
          </>
        ) : (
          <>
            <Label className="mb-4">winner</Label>
            <h2
              data-text={`Team ${winner}`}
              className={`glitch display text-5xl sm:text-7xl ${winningTheme.accent}`}
            >
              Team {winner}
            </h2>
          </>
        )}
      </div>

      <div className="mb-8 grid gap-3 sm:grid-cols-2">
        <TeamCard
          label="Team A"
          theme={themeA}
          isWinner={winner === 'A'}
          players={teamAPlayers}
          playersMap={playersMap}
          score={aScore}
        />
        <TeamCard
          label="Team B"
          theme={themeB}
          isWinner={winner === 'B'}
          players={teamBPlayers}
          playersMap={playersMap}
          score={bScore}
        />
      </div>

      <Btn variant="ghost" onClick={onLeave}>
        back to home
      </Btn>
    </Screen>
  )
}

function TeamCard({ label, theme, isWinner, players, playersMap, score }) {
  return (
    <div data-team={theme.team} className={`cut-frame ${isWinner ? theme.frame : 'bg-line'}`}>
      <div
        className={`cut-face relative p-5 ${isWinner ? `ticks ${theme.face}` : 'bg-surface'}`}
      >
        <div className="mb-4 flex items-center justify-between gap-2 pr-6">
          <p className={`hud text-[0.68rem] ${isWinner ? theme.accent : 'text-faint'}`}>
            {label}
          </p>
          {isWinner && <Pill tone="accent">★ winner</Pill>}
        </div>

        <div className="mb-4 flex items-center gap-4">
          <span className="flex items-baseline gap-1.5">
            <span className="hud text-xl tabular-nums text-lime">
              {score.intercepts}
            </span>
            <span className="hud text-[0.55rem] text-faint">intercepts</span>
          </span>
          <span className="flex items-baseline gap-1.5">
            <span className="hud text-xl tabular-nums text-rose">
              {score.miscoms}
            </span>
            <span className="hud text-[0.55rem] text-faint">miscoms</span>
          </span>
        </div>

        <ul className="space-y-2">
          {players.map((uid) => {
            const p = playersMap[uid] || {}
            return (
              <li key={uid} className="flex items-center gap-2">
                <Avatar name={p.name} avatar={p.avatar} className="w-8 h-8 text-sm" />
                <span className="min-w-0 truncate font-semibold">
                  {p.name || 'Someone'}
                </span>
              </li>
            )
          })}
        </ul>
      </div>
    </div>
  )
}

export default CipherScoreboard
