import { useEffect, useRef, useState } from 'react'
import TimerBar from './TimerBar'

function Prompt({ prompt, step, totalSteps, secondsLeft, total, onSubmit }) {
  const [answer, setAnswer] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const submittedRef = useRef(false)

  const doSubmit = (text) => {
    if (submittedRef.current) return
    submittedRef.current = true
    setSubmitted(true)
    onSubmit?.(text)
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (answer.trim()) doSubmit(answer.trim())
  }

  // Time ran out before submitting — lock in whatever's typed (or nothing).
  useEffect(() => {
    if (secondsLeft === 0 && !submittedRef.current) {
      doSubmit(answer.trim() || '(no answer)')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [secondsLeft])

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 py-12">
      <div className="w-full max-w-2xl">
        <p className="text-slate-400 text-sm uppercase tracking-wider text-center mb-4">
          Prompt {step} of {totalSteps}
        </p>
        <h2 className="text-3xl sm:text-4xl font-bold text-center mb-10 leading-tight">
          {prompt}
        </h2>

        {!submitted && <TimerBar secondsLeft={secondsLeft} total={total} />}

        {!submitted ? (
          <form onSubmit={handleSubmit} className="space-y-5">
            <textarea
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              maxLength={100}
              autoFocus
              rows={3}
              placeholder="Type your funniest answer…"
              className="w-full rounded-lg bg-slate-900 border border-slate-800 px-4 py-3 focus:outline-none focus:border-purple-500 transition resize-none"
            />
            <div className="flex items-center justify-between text-sm text-slate-500">
              <span>{answer.length}/100</span>
              <span>Press submit when ready</span>
            </div>
            <button
              type="submit"
              disabled={!answer.trim()}
              className="w-full rounded-lg bg-purple-600 hover:bg-purple-500 disabled:bg-slate-800 disabled:text-slate-500 disabled:cursor-not-allowed py-3 font-semibold transition"
            >
              Submit Answer
            </button>
          </form>
        ) : (
          <div className="text-center space-y-6">
            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6 text-left">
              <p className="text-slate-400 text-sm uppercase tracking-wider mb-3">
                Your answer
              </p>
              <p className="text-xl font-medium">{answer || '(no answer)'}</p>
            </div>
            <p className="text-slate-500 text-sm">
              Locked in — waiting for the others…
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

export default Prompt
