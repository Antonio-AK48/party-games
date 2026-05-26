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
  // betConfig: { step, max } when betting is offered this matchup, else null.
  // The player picks an amount in `step` increments from 0 up to max (their
  // remaining round budget); 0 means "no bet."
  betConfig,
  maxLength = 100,
  placeholder = 'Type your funniest answer…',
  submitLabel = 'Submit Answer',
}) {
  const [answer, setAnswer] = useState('')
  const [betAmount, setBetAmount] = useState(0)
  const [submitted, setSubmitted] = useState(false)
  const submittedRef = useRef(false)
  // Mirrors `betAmount` so the time-out auto-submit reads the current value.
  const betAmountRef = useRef(0)

  const setBetAmountSynced = (v) => {
    betAmountRef.current = v
    setBetAmount(v)
  }

  const doSubmit = (text) => {
    if (submittedRef.current) return
    submittedRef.current = true
    setSubmitted(true)
    onSubmit?.(text, betAmountRef.current)
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
              <div
                className={`rounded-lg border px-4 py-3 transition ${
                  betAmount > 0
                    ? 'border-amber-400 bg-amber-400/10'
                    : 'border-slate-800 bg-slate-900'
                }`}
              >
                <div className="flex items-center justify-between font-semibold">
                  <span>🎲 Bet on this answer</span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        setBetAmountSynced(
                          Math.max(0, betAmount - betConfig.step)
                        )
                      }
                      disabled={betAmount === 0}
                      aria-label="Decrease bet"
                      className="w-9 h-9 rounded-md border border-slate-700 bg-slate-900 text-lg font-bold transition hover:border-slate-600 hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      −
                    </button>
                    <span className="w-20 text-center tabular-nums font-bold">
                      {betAmount} pts
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        setBetAmountSynced(
                          Math.min(betConfig.max, betAmount + betConfig.step)
                        )
                      }
                      disabled={betAmount >= betConfig.max}
                      aria-label="Increase bet"
                      className="w-9 h-9 rounded-md border border-slate-700 bg-slate-900 text-lg font-bold transition hover:border-slate-600 hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      +
                    </button>
                  </div>
                </div>
                <p className="mt-1 text-xs text-slate-500">
                  {betAmount > 0
                    ? `Even money — win +${betAmount}, lose −${betAmount}.`
                    : `Tap + to wager (${betConfig.step}-pt steps, up to ${betConfig.max}).`}
                </p>
              </div>
            )}
            <button
              type="submit"
              disabled={!answer.trim()}
              className="w-full rounded-lg bg-purple-600 hover:bg-purple-500 disabled:bg-slate-800 disabled:text-slate-500 disabled:cursor-not-allowed py-3 font-semibold transition"
            >
              {betAmount > 0 ? `Submit & Bet ${betAmount}` : submitLabel}
            </button>
          </form>
        ) : (
          <div className="text-center space-y-6">
            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6 text-left">
              <p className="text-slate-400 text-sm uppercase tracking-wider mb-3">
                Your answer
              </p>
              <p className="text-xl font-medium break-words">{answer || '(no answer)'}</p>
              {betAmount > 0 && (
                <p className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-amber-400/40 bg-amber-400/10 px-3 py-1 text-xs font-bold uppercase tracking-wide text-amber-300">
                  🎲 Bet {betAmount} placed
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
