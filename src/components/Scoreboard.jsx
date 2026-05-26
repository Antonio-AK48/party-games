import { useEffect } from 'react'
import confetti from 'canvas-confetti'
import Avatar from './Avatar'
import useCountUp from '../hooks/useCountUp'
import { sounds } from '../lib/sound'

// One scoreboard row. Extracted so each row gets its own useCountUp instance,
// keeping the hook count stable inside Scoreboard.
function ScoreRow({ player, rank, top }) {
  const score = useCountUp(player.score, 1500)
  // Bar tracks the animated value so it fills in lockstep with the number.
  const pct = Math.max(8, top > 0 ? Math.round((score / top) * 100) : 8)
  return (
    <li className="relative overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 p-5">
      <div
        className="absolute inset-y-0 left-0 bg-purple-600/15"
        style={{ width: `${pct}%` }}
      />
      <div className="relative flex items-center gap-4">
        <span className="text-2xl font-bold text-slate-500 w-8">{rank}</span>
        <Avatar
          name={player.name}
          avatar={player.avatar}
          className="w-10 h-10 text-base"
        />
        <span className="text-lg font-medium flex-1">{player.name}</span>
        <span className="text-2xl font-bold tabular-nums">{score}</span>
      </div>
    </li>
  )
}

function Scoreboard({ players, isFinal, isHost, onNext, onPlayAgain, onLeave }) {
  const sorted = [...players].sort((a, b) => b.score - a.score)
  const top = sorted[0]?.score || 1
  const winner = sorted[0]
  const winnerName = winner?.name

  // Fire a confetti burst + delayed side cannons whenever this mounts in final
  // state. Keying on winnerName avoids re-firing every time RTDB emits a new
  // players reference with the same data.
  useEffect(() => {
    if (!isFinal || !winnerName) return
    sounds.winner()
    confetti({ particleCount: 140, spread: 80, origin: { y: 0.4 } })
    const sideCannons = setTimeout(() => {
      confetti({ particleCount: 60, angle: 60, spread: 65, origin: { x: 0, y: 0.6 } })
      confetti({ particleCount: 60, angle: 120, spread: 65, origin: { x: 1, y: 0.6 } })
    }, 400)
    const finale = setTimeout(() => {
      confetti({ particleCount: 100, spread: 100, startVelocity: 35, origin: { y: 0.5 } })
    }, 1200)
    return () => {
      clearTimeout(sideCannons)
      clearTimeout(finale)
    }
  }, [isFinal, winnerName])

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 py-12">
      <div className="w-full max-w-2xl">
        {isFinal && winner ? (
          <div className="flex flex-col items-center text-center mb-10">
            <p className="text-slate-400 text-sm uppercase tracking-wider mb-6">
              Final Scores
            </p>
            <Avatar
              name={winner.name}
              avatar={winner.avatar}
              className="w-40 h-40 text-6xl ring-4 ring-purple-500 ring-offset-4 ring-offset-slate-950 mb-6"
            />
            <h2 className="text-4xl sm:text-5xl font-bold">
              {winner.name} wins!
            </h2>
          </div>
        ) : (
          <>
            <p className="text-slate-400 text-sm uppercase tracking-wider text-center mb-3">
              Standings
            </p>
            <h2 className="text-4xl sm:text-5xl font-bold text-center mb-10">
              Scoreboard
            </h2>
          </>
        )}

        <ol className="space-y-3">
          {sorted.map((p, i) => (
            <ScoreRow key={p.name} player={p} rank={i + 1} top={top} />
          ))}
        </ol>

        <div className="flex flex-col sm:flex-row gap-3 mt-10">
          {isHost ? (
            <button
              onClick={isFinal ? onPlayAgain : onNext}
              className="flex-1 rounded-lg bg-purple-600 hover:bg-purple-500 py-3 font-semibold transition"
            >
              {isFinal ? 'Play Again ↻' : 'Next Round →'}
            </button>
          ) : (
            <div className="flex-1 rounded-lg bg-slate-800 text-slate-400 py-3 font-semibold text-center">
              Waiting for the host…
            </div>
          )}
          <button
            onClick={onLeave}
            className="rounded-lg border border-slate-800 hover:bg-slate-900 py-3 px-6 font-semibold transition"
          >
            {isFinal ? 'Back to Home' : 'Leave Game'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default Scoreboard
