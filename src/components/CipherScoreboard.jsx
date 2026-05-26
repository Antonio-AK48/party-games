import { useEffect } from 'react'
import confetti from 'canvas-confetti'
import Avatar from './Avatar'
import { toArr } from '../lib/cipher'
import { sounds } from '../lib/sound'

// Phase: cipher-scoreboard. Game over — show the winning team, both rosters,
// and final intercept/miscom tallies. Confetti + fanfare for a non-tie win.
function CipherScoreboard({
  cipher,
  playersMap,
  themeA,
  themeB,
  onLeave,
}) {
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
    <div className="min-h-screen flex flex-col items-center justify-center px-6 py-12">
      <div className="w-full max-w-2xl">
        {winner === 'tie' ? (
          <div className="text-center mb-10">
            <p className="text-slate-400 text-sm uppercase tracking-wider mb-3">
              Final result
            </p>
            <h2 className="text-4xl sm:text-5xl font-bold">It's a tie!</h2>
          </div>
        ) : (
          <div className="text-center mb-10">
            <p className="text-slate-400 text-sm uppercase tracking-wider mb-3">
              Winner
            </p>
            <h2 className={`text-5xl sm:text-6xl font-black ${winningTheme.accent}`}>
              Team {winner}
            </h2>
          </div>
        )}

        <div className="grid sm:grid-cols-2 gap-3 mb-8">
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

        <button
          onClick={onLeave}
          className="w-full rounded-lg border border-slate-800 hover:bg-slate-900 py-3 px-6 font-semibold transition"
        >
          Back to Home
        </button>
      </div>
    </div>
  )
}

function TeamCard({ label, theme, isWinner, players, playersMap, score }) {
  return (
    <div
      className={`rounded-2xl border p-5 transition ${
        isWinner ? `${theme.border} ${theme.bg}` : 'border-slate-800 bg-slate-900'
      }`}
    >
      <div className="flex items-center justify-between mb-3">
        <p
          className={`text-xs uppercase tracking-[0.3em] font-semibold ${
            isWinner ? theme.accent : 'text-slate-400'
          }`}
        >
          {label}
        </p>
        {isWinner && (
          <span
            className={`text-xs font-bold uppercase tracking-wide ${theme.accent}`}
          >
            ★ Winner
          </span>
        )}
      </div>

      <div className="flex items-center gap-4 mb-4 text-sm">
        <span className="flex items-center gap-1.5">
          <span className="text-emerald-300 font-bold">{score.intercepts}</span>
          <span className="text-slate-500">intercepts</span>
        </span>
        <span className="flex items-center gap-1.5">
          <span className="text-rose-300 font-bold">{score.miscoms}</span>
          <span className="text-slate-500">miscoms</span>
        </span>
      </div>

      <ul className="space-y-2">
        {players.map((uid) => {
          const p = playersMap[uid] || {}
          return (
            <li key={uid} className="flex items-center gap-2">
              <Avatar name={p.name} avatar={p.avatar} className="w-8 h-8 text-sm" />
              <span className="font-medium">{p.name || 'Someone'}</span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

export default CipherScoreboard
