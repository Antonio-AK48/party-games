import { useState } from 'react'
import TimerBar from './TimerBar'
import { sounds } from '../lib/sound'

// Round 3 / Author's Cut, sequential phase: every player sees the same prompt
// and the 3 anonymous answers; only the prompt's author can pick. The point of
// the shared view is the laughter — non-authors get to read along and react
// while the judge decides live.
function Round3Judging({
  prompt,
  judgeName,
  answers,
  chosenIndex,
  isAuthor,
  secondsLeft,
  total,
  step,
  totalSteps,
  onChoose,
}) {
  const [picked, setPicked] = useState(chosenIndex)
  const selected = picked ?? chosenIndex
  const locked = selected != null

  const handlePick = (i) => {
    if (locked || !isAuthor) return
    setPicked(i)
    onChoose?.(i)
    sounds.vote()
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 py-12">
      <div className="w-full max-w-2xl">
        <p className="text-slate-400 text-sm uppercase tracking-wider text-center mb-2">
          Prompt {step} of {totalSteps} · author's cut
        </p>
        <p className="text-purple-300 text-sm font-semibold text-center mb-4">
          {isAuthor
            ? 'Your prompt — pick the funniest'
            : `${judgeName} is choosing the funniest`}
        </p>
        <h2 className="text-2xl sm:text-3xl font-bold text-center mb-10 leading-tight">
          {prompt}
        </h2>

        <TimerBar secondsLeft={secondsLeft} total={total} />

        <div className="space-y-4">
          {answers.map((text, i) => {
            const isPicked = selected === i
            const isDimmed = locked && !isPicked
            const card = isPicked
              ? 'border-purple-500 bg-purple-950/40'
              : isDimmed
              ? 'border-slate-800 bg-slate-900 opacity-40'
              : isAuthor
              ? 'border-slate-800 bg-slate-900 hover:border-slate-700 hover:bg-slate-800'
              : 'border-slate-800 bg-slate-900'
            return isAuthor ? (
              <button
                key={i}
                onClick={() => handlePick(i)}
                disabled={locked}
                className={`w-full text-left rounded-2xl border p-6 transition ${card}`}
              >
                <p className="text-lg font-medium break-words">{text}</p>
              </button>
            ) : (
              <div
                key={i}
                className={`rounded-2xl border p-6 transition ${card}`}
              >
                <p className="text-lg font-medium break-words">{text}</p>
              </div>
            )
          })}
        </div>

        <p className="text-center text-slate-400 mt-8">
          {locked
            ? isAuthor
              ? 'Locked in.'
              : `${judgeName} picked their winner`
            : isAuthor
            ? "Pick when you're ready"
            : 'Waiting on the judge…'}
        </p>
      </div>
    </div>
  )
}

export default Round3Judging
