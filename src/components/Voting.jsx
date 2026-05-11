import { useState } from 'react'

function Voting({ prompt, answers, isAuthor, step, totalSteps, onVote, onNext }) {
  const [voted, setVoted] = useState(null)

  const handleVote = (index) => {
    if (voted !== null) return
    setVoted(index)
    onVote?.(index)
  }

  if (isAuthor) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6 py-12">
        <div className="w-full max-w-2xl">
          <p className="text-slate-400 text-sm uppercase tracking-wider text-center mb-4">
            Matchup {step} of {totalSteps} · this one's yours
          </p>
          <h2 className="text-2xl sm:text-3xl font-bold text-center mb-10 leading-tight">
            {prompt}
          </h2>

          <div className="space-y-4">
            {answers.map((text, i) => (
              <div
                key={i}
                className="rounded-2xl border border-slate-800 bg-slate-900 p-6"
              >
                <p className="text-lg font-medium">{text}</p>
              </div>
            ))}
          </div>

          <div className="text-center mt-8 space-y-3">
            <p className="text-slate-400">
              You're in this matchup — sit back while the others vote.
            </p>
            <button
              onClick={onNext}
              className="rounded-lg bg-purple-600 hover:bg-purple-500 px-6 py-3 font-semibold transition"
            >
              Reveal results →
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 py-12">
      <div className="w-full max-w-2xl">
        <p className="text-slate-400 text-sm uppercase tracking-wider text-center mb-4">
          Matchup {step} of {totalSteps} · vote for the best
        </p>
        <h2 className="text-2xl sm:text-3xl font-bold text-center mb-10 leading-tight">
          {prompt}
        </h2>

        <div className="space-y-4">
          {answers.map((text, i) => {
            const isPicked = voted === i
            const isDimmed = voted !== null && !isPicked
            return (
              <button
                key={i}
                onClick={() => handleVote(i)}
                disabled={voted !== null}
                className={`w-full text-left rounded-2xl border p-6 transition ${
                  isPicked
                    ? 'border-purple-500 bg-purple-950/40'
                    : isDimmed
                    ? 'border-slate-800 bg-slate-900 opacity-40'
                    : 'border-slate-800 bg-slate-900 hover:border-slate-700 hover:bg-slate-800'
                }`}
              >
                <p className="text-lg font-medium">{text}</p>
              </button>
            )
          })}
        </div>

        {voted !== null && (
          <div className="text-center mt-8 space-y-3">
            <p className="text-slate-400">Locked in. Waiting for others…</p>
            <button
              onClick={onNext}
              className="rounded-lg bg-purple-600 hover:bg-purple-500 px-6 py-3 font-semibold transition"
            >
              Reveal results →
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export default Voting
