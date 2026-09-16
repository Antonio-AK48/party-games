import Avatar from './Avatar'
import useCountUp from '../hooks/useCountUp'
import { Screen, Pill, PhaseHeader } from './ui'

// Maps a revealed wager outcome to a Pill tone.
const wagerTone = (result) =>
  result === 'win' ? 'good' : result === 'lose' ? 'bad' : 'neutral'

// One answer card. Extracted so each row gets its own useCountUp instances —
// every number we render (votes, base points, sweep bonus, bet stake,
// intervention stake) climbs from 0 over ~1.2-1.5s for the reveal beat.
function AnswerRow({ answer: a, isWinner, totalVotes, showPoints }) {
  const votes = useCountUp(a.votes, 900)
  // Always call these so the hook count is stable even when a card has no bet /
  // intervention / sweep — the helper renders 0 immediately for non-positive
  // targets, so unused calls are cheap and inert.
  const points = useCountUp(a.points || 0, 1500)
  const bonus = useCountUp(a.bonus || 0, 1200)
  const betStake = useCountUp(a.bet?.stake || 0, 1500)
  const ivStake = useCountUp(a.intervention?.stake || 0, 1500)
  // Bar tracks the animated vote count so it grows in sync with the number.
  const pct = totalVotes ? Math.round((votes / totalVotes) * 100) : 0

  return (
    <div
      className={`cut-frame transition ${
        isWinner ? 'bg-[var(--accent)] shadow-[var(--accent-glow)]' : 'bg-line'
      }`}
    >
      <div
        className={`cut-face ticks relative overflow-hidden p-5 ${
          isWinner ? 'bg-[var(--accent)]/12' : 'bg-surface'
        }`}
      >
        {/* Vote share as a filled bar behind the content. */}
        <div
          className={`absolute inset-y-0 left-0 transition-all duration-500 ${
            isWinner ? 'bg-[var(--accent)]/20' : 'bg-surface-3/60'
          }`}
          style={{ width: `${pct}%` }}
        />
        <div className="relative flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <p className="mb-1 text-lg font-medium break-words">{a.text}</p>
            <p className="hud mb-3 text-[0.62rem] text-faint">by {a.author}</p>

            <div className="flex flex-wrap gap-2">
              {showPoints && !a.intervention && a.points > 0 && (
                <Pill tone="good">+{points} pts</Pill>
              )}
              {showPoints && a.sweep && (
                <Pill tone="stake">🧹 sweep +{bonus}</Pill>
              )}
              {showPoints && a.bet && (
                <Pill tone={wagerTone(a.bet.result)}>
                  ◈ bet{' '}
                  {a.bet.result === 'win'
                    ? `won +${betStake}`
                    : a.bet.result === 'lose'
                      ? `lost −${betStake}`
                      : 'pushed'}
                </Pill>
              )}
              {showPoints && a.intervention && (
                <Pill tone={wagerTone(a.intervention.result)}>
                  ⚡ intervention{' '}
                  {a.intervention.result === 'win'
                    ? `won +${ivStake}`
                    : a.intervention.result === 'lose'
                      ? `flopped −${ivStake}`
                      : 'survived'}
                </Pill>
              )}
            </div>

            {a.voters.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {a.voters.map((v, vi) => (
                  <Avatar
                    key={vi}
                    name={v.name}
                    avatar={v.avatar}
                    className="w-7 h-7 text-xs"
                  />
                ))}
              </div>
            )}
          </div>

          <div className="shrink-0 pr-5 text-right">
            <p
              className={`hud text-3xl leading-none tabular-nums ${
                isWinner ? 'accent-text' : 'text-bright'
              }`}
            >
              {String(votes).padStart(2, '0')}
            </p>
            <p className="hud mt-1 text-[0.55rem] text-faint">
              {a.votes === 1 ? 'vote' : 'votes'}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

function RoundResults({ prompt, answers, step, totalSteps, showPoints = true }) {
  const totalVotes = answers.reduce((sum, a) => sum + a.votes, 0) || 1
  const winner = answers.reduce(
    (best, a) => (a.votes > best.votes ? a : best),
    answers[0]
  )
  const isLast = step >= totalSteps

  return (
    <Screen>
      <PhaseHeader
        kicker={`matchup ${step} of ${totalSteps} · results`}
        title={prompt}
      />

      <div className="space-y-3">
        {answers.map((a, i) => (
          <AnswerRow
            key={i}
            answer={a}
            isWinner={a === winner && a.votes > 0}
            totalVotes={totalVotes}
            showPoints={showPoints}
          />
        ))}
      </div>

      <p className="hud mt-8 text-center text-[0.62rem] text-faint">
        {isLast ? 'tallying the scoreboard…' : 'next matchup coming up…'}
      </p>
    </Screen>
  )
}

export default RoundResults
