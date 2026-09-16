import { useEffect } from 'react'
import confetti from 'canvas-confetti'
import Avatar from './Avatar'
import useCountUp from '../hooks/useCountUp'
import { sounds } from '../lib/sound'
import { Screen, Btn, Label } from './ui'

// One scoreboard row. Extracted so each row gets its own useCountUp instance,
// keeping the hook count stable inside Scoreboard.
function ScoreRow({ player, rank, top }) {
  const score = useCountUp(player.score, 1500)
  // Bar tracks the animated value so it fills in lockstep with the number.
  const pct = Math.max(8, top > 0 ? Math.round((score / top) * 100) : 8)
  const isLeader = rank === 1
  return (
    <li
      className={`cut-frame cut-sm ${
        isLeader ? 'bg-[var(--accent)] shadow-[var(--accent-glow)]' : 'bg-line'
      }`}
    >
      <div
        className={`cut-face relative overflow-hidden p-4 ${
          isLeader ? 'bg-[var(--accent)]/10' : 'bg-surface'
        }`}
      >
        <div
          className="absolute inset-y-0 left-0 bg-[var(--accent)]/15 transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
        <div className="relative flex items-center gap-4">
          <span
            className={`hud w-8 shrink-0 text-lg tabular-nums ${
              isLeader ? 'accent-text' : 'text-faint'
            }`}
          >
            {String(rank).padStart(2, '0')}
          </span>
          <Avatar
            name={player.name}
            avatar={player.avatar}
            className="w-10 h-10 text-base"
          />
          <span className="min-w-0 flex-1 truncate text-lg font-semibold">
            {player.name}
          </span>
          <span className="hud text-2xl tabular-nums">{score}</span>
        </div>
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
    <Screen>
      {isFinal && winner ? (
        <div className="mb-10 flex flex-col items-center text-center">
          <Label accent className="mb-6">
            final scores
          </Label>
          <Avatar
            name={winner.name}
            avatar={winner.avatar}
            className="w-36 h-36 text-6xl shadow-[var(--accent-glow)] mb-6"
            cut="20%"
          />
          <h2
            data-text={`${winner.name} wins`}
            className="glitch display neon text-4xl sm:text-6xl"
          >
            {winner.name} wins
          </h2>
        </div>
      ) : (
        <div className="mb-10 text-center">
          <Label className="mb-3">standings</Label>
          <h2 className="display neon-quiet text-5xl sm:text-6xl">Scoreboard</h2>
        </div>
      )}

      <ol className="space-y-2.5">
        {sorted.map((p, i) => (
          <ScoreRow key={p.name} player={p} rank={i + 1} top={top} />
        ))}
      </ol>

      <div className="mt-10 flex flex-col gap-3 sm:flex-row">
        {isHost ? (
          <Btn onClick={isFinal ? onPlayAgain : onNext} className="flex-1">
            {isFinal ? '↻ play again' : 'next round →'}
          </Btn>
        ) : (
          <div className="cut-frame cut-sm flex-1 bg-line">
            <div className="cut-face bg-surface px-5 py-3.5 text-center">
              <span className="hud text-sm text-faint">waiting for the host…</span>
            </div>
          </div>
        )}
        <Btn variant="ghost" onClick={onLeave} className="sm:w-48">
          {isFinal ? 'back to home' : 'leave game'}
        </Btn>
      </div>
    </Screen>
  )
}

export default Scoreboard
