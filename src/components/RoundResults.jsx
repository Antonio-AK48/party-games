import Avatar from './Avatar'

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
          {answers.map((a, i) => {
            const pct = Math.round((a.votes / totalVotes) * 100)
            const isWinner = a === winner && a.votes > 0
            return (
              <div
                key={i}
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
                    <p className="text-sm text-slate-400 mb-2">
                      by {a.author}
                      {showPoints && ` · +${a.votes * 100} pts`}
                    </p>
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
                    <p className="text-2xl font-bold">{a.votes}</p>
                    <p className="text-xs text-slate-500">
                      {a.votes === 1 ? 'vote' : 'votes'}
                    </p>
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        <p className="text-center text-slate-500 text-sm mt-8">
          {isLast ? 'Tallying the scoreboard…' : 'Next matchup coming up…'}
        </p>
      </div>
    </div>
  )
}

export default RoundResults
