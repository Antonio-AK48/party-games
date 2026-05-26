import Avatar from './Avatar'
import useCountUp from '../hooks/useCountUp'

// Coloured pill for a revealed wager outcome (bet or intervention).
function WagerBadge({ children, result }) {
  const tone =
    result === 'win'
      ? 'border-emerald-400/40 bg-emerald-400/10 text-emerald-300'
      : result === 'lose'
      ? 'border-rose-400/40 bg-rose-400/10 text-rose-300'
      : 'border-slate-600/50 bg-slate-700/20 text-slate-300'
  return (
    <p
      className={`mb-2 mr-2 inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-wide ${tone}`}
    >
      {children}
    </p>
  )
}

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
      className={`relative overflow-hidden rounded-2xl border p-6 ${
        isWinner
          ? 'border-purple-500 bg-purple-950/40'
          : 'border-slate-800 bg-slate-900'
      }`}
    >
      <div
        className={`absolute inset-y-0 left-0 ${
          isWinner ? 'bg-purple-600/20' : 'bg-slate-700/20'
        }`}
        style={{ width: `${pct}%` }}
      />
      <div className="relative flex items-center justify-between gap-4">
        <div className="min-w-0 flex-1">
          <p className="text-lg font-medium mb-1 break-words">{a.text}</p>
          <p className="text-sm text-slate-400 mb-2">by {a.author}</p>
          {showPoints && !a.intervention && a.points > 0 && (
            <p className="mb-2 mr-2 inline-flex items-center gap-1.5 rounded-full border border-emerald-400/40 bg-emerald-400/10 px-3 py-1 text-sm font-bold tabular-nums tracking-wide text-emerald-300">
              +{points} pts
            </p>
          )}
          {showPoints && a.sweep && (
            <p className="mb-2 mr-2 inline-flex items-center gap-1.5 rounded-full border border-amber-400/40 bg-amber-400/10 px-3 py-1 text-xs font-bold uppercase tracking-wide text-amber-300">
              🧹 Sweep! +{bonus} bonus
            </p>
          )}
          {showPoints && a.bet && (
            <WagerBadge result={a.bet.result}>
              🎲 Bet{' '}
              {a.bet.result === 'win'
                ? `won +${betStake}`
                : a.bet.result === 'lose'
                ? `lost -${betStake}`
                : 'pushed'}
            </WagerBadge>
          )}
          {showPoints && a.intervention && (
            <WagerBadge result={a.intervention.result}>
              ⚡ Intervention{' '}
              {a.intervention.result === 'win'
                ? `won +${ivStake}`
                : a.intervention.result === 'lose'
                ? `flopped -${ivStake}`
                : 'survived'}
            </WagerBadge>
          )}
          {a.voters.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
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
        <div className="text-right shrink-0">
          <p className="text-2xl font-bold tabular-nums">{votes}</p>
          <p className="text-xs text-slate-500">
            {a.votes === 1 ? 'vote' : 'votes'}
          </p>
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
    <div className="min-h-screen flex flex-col items-center justify-center px-6 py-12">
      <div className="w-full max-w-2xl">
        <p className="text-slate-400 text-sm uppercase tracking-wider text-center mb-4">
          Matchup {step} of {totalSteps} · results
        </p>
        <h2 className="text-2xl sm:text-3xl font-bold text-center mb-10 leading-tight">
          {prompt}
        </h2>

        <div className="space-y-4">
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

        <p className="text-center text-slate-500 text-sm mt-8">
          {isLast ? 'Tallying the scoreboard…' : 'Next matchup coming up…'}
        </p>
      </div>
    </div>
  )
}

export default RoundResults
