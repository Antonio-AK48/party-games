import { useEffect, useRef, useState } from 'react'
import TimerBar from './TimerBar'
import { sounds } from '../lib/sound'

function Prompt({
  prompt,
  step,
  totalSteps,
  secondsLeft,
  total,
  onSubmit,
  betConfig, // { stake } when betting is offered this matchup, else null/undefined
  maxLength = 100,
  placeholder = 'Type your funniest answer…',
  submitLabel = 'Submit Answer',
}) {
  const [answer, setAnswer] = useState('')
  const [bet, setBet] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const submittedRef = useRef(false)
  const betRef = useRef(false) // mirrors `bet` so the time-out submit sees it too

  const setBetSynced = (v) => {
    betRef.current = v
    setBet(v)
  }

  const doSubmit = (text) => {
    if (submittedRef.current) return
    submittedRef.current = true
    setSubmitted(true)
    onSubmit?.(text, betRef.current)
    sounds.submit()
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
              maxLength={maxLength}
              autoFocus
              rows={3}
              placeholder={placeholder}
              className="w-full rounded-lg bg-slate-900 border border-slate-800 px-4 py-3 focus:outline-none focus:border-purple-500 transition resize-none"
            />
            <div className="flex items-center justify-between text-sm text-slate-500">
              <span>{answer.length}/{maxLength}</span>
              <span>Press submit when ready</span>
            </div>
            {betConfig && (
              <button
                type="button"
                onClick={() => setBetSynced(!bet)}
                aria-pressed={bet}
                className={`w-full rounded-lg border px-4 py-3 text-left transition ${
                  bet
                    ? 'border-amber-400 bg-amber-400/10'
                    : 'border-slate-800 bg-slate-900 hover:border-slate-700'
                }`}
              >
                <span className="flex items-center justify-between font-semibold">
                  <span>🎲 Bet {betConfig.stake} on this answer</span>
                  <span
                    className={`text-xs uppercase tracking-wide ${
                      bet ? 'text-amber-300' : 'text-slate-500'
                    }`}
                  >
                    {bet ? 'Wager on' : 'Tap to wager'}
                  </span>
                </span>
                <span className="mt-1 block text-xs text-slate-500">
                  Even money — beat your matchup and win +{betConfig.stake}, lose
                  it and drop −{betConfig.stake}.
                </span>
              </button>
            )}
            <button
              type="submit"
              disabled={!answer.trim()}
              className="w-full rounded-lg bg-purple-600 hover:bg-purple-500 disabled:bg-slate-800 disabled:text-slate-500 disabled:cursor-not-allowed py-3 font-semibold transition"
            >
              {bet ? `Submit & Bet ${betConfig.stake}` : submitLabel}
            </button>
          </form>
        ) : (
          <div className="text-center space-y-6">
            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6 text-left">
              <p className="text-slate-400 text-sm uppercase tracking-wider mb-3">
                Your answer
              </p>
              <p className="text-xl font-medium break-words">{answer || '(no answer)'}</p>
              {bet && betConfig && (
                <p className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-amber-400/40 bg-amber-400/10 px-3 py-1 text-xs font-bold uppercase tracking-wide text-amber-300">
                  🎲 Bet {betConfig.stake} placed
                </p>
              )}
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
