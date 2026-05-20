import { useState } from 'react'
import TimerBar from './TimerBar'

function Voting({
  prompt,
  answers,
  isAuthor,
  votedIndex,
  step,
  totalSteps,
  secondsLeft,
  total,
  onVote,
}) {
  // votedIndex comes from the room (survives refresh); picked is the optimistic
  // local choice so the UI reacts instantly before RTDB echoes it back.
  const [picked, setPicked] = useState(votedIndex)
  const selected = picked ?? votedIndex
  const locked = selected != null

  const handleVote = (index) => {
    if (locked) return
    setPicked(index)
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

          <TimerBar secondsLeft={secondsLeft} total={total} />

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

          <p className="text-center text-slate-400 mt-8">
            You're in this matchup — sit back while the others vote.
          </p>
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

        <TimerBar secondsLeft={secondsLeft} total={total} />

        <div className="space-y-4">
          {answers.map((text, i) => {
            const isPicked = selected === i
            const isDimmed = locked && !isPicked
            return (
              <button
                key={i}
                onClick={() => handleVote(i)}
                disabled={locked}
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

        {locked && (
          <p className="text-center text-slate-400 mt-8">
            Locked in. Waiting for the others…
          </p>
        )}
      </div>
    </div>
  )
}

export default Voting
