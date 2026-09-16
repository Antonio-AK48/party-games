import { useEffect, useRef, useState } from 'react'
import TimerBar from './TimerBar'
import { sounds } from '../lib/sound'
import { Screen, Panel, Btn, Label, Pill, TextArea, PhaseHeader } from './ui'

function Prompt({
  prompt,
  step,
  totalSteps,
  secondsLeft,
  total,
  onSubmit,
  // Called (debounced) with the raw text every time it changes, so the room
  // keeps what the player typed even if they never hit submit. `initialDraft`
  // seeds the box back from that stored draft after a reload or reconnect.
  onDraft,
  initialDraft = '',
  // betConfig: { step, max } when betting is offered this matchup, else null.
  // The player picks an amount in `step` increments from 0 up to max (their
  // remaining round budget); 0 means "no bet."
  betConfig,
  maxLength = 100,
  placeholder = 'Type your funniest answer…',
  submitLabel = 'Submit Answer',
}) {
  const [answer, setAnswer] = useState(initialDraft || '')
  const [betAmount, setBetAmount] = useState(0)
  const [submitted, setSubmitted] = useState(false)
  const submittedRef = useRef(false)
  // Mirrors `betAmount` so the time-out auto-submit reads the current value.
  const betAmountRef = useRef(0)
  // Debounce handle for the draft write, plus a ref to the latest callback so
  // the timer never fires against a stale closure.
  const draftTimerRef = useRef(null)
  const onDraftRef = useRef(onDraft)
  const secondsLeftRef = useRef(secondsLeft)
  useEffect(() => {
    onDraftRef.current = onDraft
    secondsLeftRef.current = secondsLeft
  })

  const setBetAmountSynced = (v) => {
    betAmountRef.current = v
    setBetAmount(v)
  }

  const handleChange = (e) => {
    const text = e.target.value
    setAnswer(text)
    if (!onDraftRef.current) return
    clearTimeout(draftTimerRef.current)
    // Coalesce keystrokes normally, but write through immediately in the last
    // few seconds so the final word still lands before the host closes the phase.
    const delay = secondsLeftRef.current != null && secondsLeftRef.current <= 5 ? 0 : 400
    draftTimerRef.current = setTimeout(() => {
      if (!submittedRef.current) onDraftRef.current?.(text)
    }, delay)
  }

  useEffect(() => () => clearTimeout(draftTimerRef.current), [])

  const doSubmit = (text) => {
    if (submittedRef.current) return
    submittedRef.current = true
    clearTimeout(draftTimerRef.current)
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
    <Screen>
      <PhaseHeader
        kicker={`prompt ${step} of ${totalSteps}`}
        title={prompt}
      />

      {!submitted && <TimerBar secondsLeft={secondsLeft} total={total} />}

      {!submitted ? (
        <form onSubmit={handleSubmit} className="space-y-4">
          <TextArea
            value={answer}
            onChange={handleChange}
            maxLength={maxLength}
            autoFocus
            rows={3}
            placeholder={placeholder}
          />
          <div className="flex items-baseline justify-between">
            <span className="hud text-[0.62rem] tabular-nums text-faint">
              {String(answer.length).padStart(3, '0')}/{maxLength}
            </span>
            <span className="hud text-[0.62rem] text-faint">
              {onDraft ? 'autosaving · submit to lock' : 'press submit when ready'}
            </span>
          </div>

          {betConfig && (
            <Panel
              sm
              tone={betAmount > 0 ? 'bg-amber' : ''}
              bodyClassName={`p-4 ${betAmount > 0 ? 'bg-amber/10' : ''}`}
            >
              <div className="flex items-center justify-between gap-3">
                <span className="hud text-[0.68rem] text-amber">
                  ◈ bet on this answer
                </span>
                <div className="flex items-center gap-2">
                  <StepBtn
                    onClick={() =>
                      setBetAmountSynced(Math.max(0, betAmount - betConfig.step))
                    }
                    disabled={betAmount === 0}
                    label="Decrease bet"
                  >
                    −
                  </StepBtn>
                  <span className="hud w-20 text-center text-base tabular-nums text-amber">
                    {betAmount}
                  </span>
                  <StepBtn
                    onClick={() =>
                      setBetAmountSynced(
                        Math.min(betConfig.max, betAmount + betConfig.step)
                      )
                    }
                    disabled={betAmount >= betConfig.max}
                    label="Increase bet"
                  >
                    +
                  </StepBtn>
                </div>
              </div>
              <p className="mt-2 text-xs text-faint">
                {betAmount > 0
                  ? `Even money — win +${betAmount}, lose −${betAmount}.`
                  : `Tap + to wager (${betConfig.step}-pt steps, up to ${betConfig.max}).`}
              </p>
            </Panel>
          )}

          <Btn type="submit" disabled={!answer.trim()}>
            {betAmount > 0 ? `submit & bet ${betAmount}` : submitLabel}
          </Btn>
        </form>
      ) : (
        <div className="space-y-6 text-center">
          <Panel ticks lit bodyClassName="p-6 text-left">
            <Label accent className="mb-3">
              your answer · locked
            </Label>
            <p className="text-xl font-semibold break-words">
              {answer || '(no answer)'}
            </p>
            {betAmount > 0 && (
              <Pill tone="stake" className="mt-4">
                ◈ bet {betAmount} placed
              </Pill>
            )}
          </Panel>
          <p className="hud text-[0.65rem] text-faint">
            waiting for the others…
          </p>
        </div>
      )}
    </Screen>
  )
}

// Square stepper for the bet control — matches the chamfered button language.
function StepBtn({ children, label, ...rest }) {
  return (
    <button
      type="button"
      aria-label={label}
      style={{ '--cut': '6px' }}
      className="cut h-11 w-11 bg-surface-3 text-lg font-bold text-amber transition hover:bg-amber hover:text-ink disabled:bg-surface-2 disabled:text-faint disabled:cursor-not-allowed"
      {...rest}
    >
      {children}
    </button>
  )
}

export default Prompt
