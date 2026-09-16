import { useState, useEffect } from 'react'
import TimerBar from './TimerBar'
import { VOTE_LOCK_MS } from '../lib/game'
import { sounds } from '../lib/sound'
import { Screen, Panel, Btn, Label, TextArea, PhaseHeader } from './ui'

const LOCK_TOTAL = VOTE_LOCK_MS / 1000

// Full-screen, deliberately anonymous announcement shown to everyone EXCEPT the
// person stepping in, while they write their third answer. Names no one — you
// don't learn who challenged until the results reveal.
function InterventionFlash({ secondsLeft }) {
  // One dramatic swoop the moment the challenge lands.
  useEffect(() => {
    sounds.intervention()
  }, [])
  return (
    // Forced to the cyan accent: an intervention is a system interrupt, not a
    // Captions moment, so it deliberately breaks the round's magenta.
    <div data-game="cipher">
      <Screen className="overflow-hidden text-center">
        <div className="relative flex flex-col items-center">
          <div className="iv-flash-ring absolute -inset-16 bg-cyan/20 blur-3xl" />
          <div className="iv-flash-bolt text-7xl sm:text-8xl">⚡</div>
          <h2
            data-text="INTERVENTION"
            className="glitch display neon iv-flash-text mt-4 text-4xl sm:text-6xl"
          >
            INTERVENTION
          </h2>
          <p className="mt-5 max-w-sm text-muted">
            Someone thinks they can do better — a third answer is coming.
          </p>
          {secondsLeft != null && (
            <p className="hud mt-7 text-[0.65rem] accent-text">
              hold your vote · {secondsLeft}s
            </p>
          )}
        </div>
      </Screen>
    </div>
  )
}

// One answer in the list. Buttons when you can vote, plain panels when you
// can't — same shell either way so the layout doesn't shift between states.
function AnswerOption({ text, index, picked, dimmed, disabled, onClick }) {
  const body = (
    <>
      <span className="hud absolute left-4 top-3 text-[0.6rem] text-faint">
        {String.fromCharCode(65 + index)}
      </span>
      <p className="pl-7 text-lg font-medium break-words">{text}</p>
    </>
  )
  const frameTone = picked
    ? 'bg-[var(--accent)] shadow-[var(--accent-glow)]'
    : 'bg-line'
  const faceTone = picked
    ? 'bg-[var(--accent)]/12'
    : dimmed
      ? 'bg-surface opacity-40'
      : 'bg-surface'

  if (disabled) {
    return (
      <div className={`cut-frame transition ${frameTone}`}>
        <div className={`cut-face relative p-5 transition ${faceTone}`}>
          {body}
        </div>
      </div>
    )
  }
  return (
    <button
      onClick={onClick}
      className={`cut-frame block w-full text-left transition hover:bg-line-bright focus-visible:outline-none focus-visible:bg-[var(--accent)] ${frameTone}`}
    >
      <span className={`cut-face relative block p-5 transition ${faceTone}`}>
        {body}
      </span>
    </button>
  )
}

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
  // Opening read-lock window + anonymous intervention (see lib/features.js):
  voteLocked = false, // votes disabled: the read window, or an in-flight intervention
  lockSecondsLeft = null, // read-window countdown, or null once it's past
  canIntervene = false, // this player may step in right now
  iClaimed = false, // this player already grabbed the slot (seeds the editor after a refresh)
  interventionPending = false, // someone else is mid-step-in → show the flash
  interventionSecondsLeft = null, // rough countdown of the claimer's writing window
  interventionStake = 0,
  typeMs = 20000,
  onClaim,
  onCancelIntervene,
  onIntervene,
}) {
  // votedIndex comes from the room (survives refresh); picked is the optimistic
  // local choice so the UI reacts instantly before RTDB echoes it back.
  const [picked, setPicked] = useState(votedIndex)
  const [intervening, setIntervening] = useState(iClaimed)
  const [ivText, setIvText] = useState('')
  const [typeLeft, setTypeLeft] = useState(null)
  const selected = picked ?? votedIndex
  const voted = selected != null

  // While typing an intervention, the host holds voting locked for everyone — so
  // cap the editor with a countdown that auto-cancels, releasing the lock if the
  // claimer stalls (mirrors INTERVENTION_TYPE_MS host-side).
  useEffect(() => {
    if (!intervening) return
    const end = Date.now() + typeMs
    const id = setInterval(() => {
      const left = Math.max(0, Math.ceil((end - Date.now()) / 1000))
      setTypeLeft(left)
      if (left <= 0) {
        clearInterval(id)
        setIntervening(false)
        onCancelIntervene?.()
      }
    }, 250)
    return () => clearInterval(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [intervening])

  const handleVote = (index) => {
    if (voted || voteLocked) return
    setPicked(index)
    onVote?.(index)
    sounds.vote()
  }

  const handleStepIn = async () => {
    setIntervening(true)
    try {
      await onClaim?.()
    } catch {
      setIntervening(false) // someone grabbed the only slot first
    }
  }

  const handleCancel = () => {
    setIntervening(false)
    onCancelIntervene?.()
  }

  const submitIntervention = () => {
    const text = ivText.trim()
    if (!text) return
    setIntervening(false)
    onIntervene?.(text)
    sounds.intervention()
  }

  // Someone else has stepped in and is writing — everyone but the claimer gets the
  // anonymous flash while voting is held. (The claimer has intervening seeded true
  // and falls through to their editor below.)
  if (interventionPending && !iClaimed) {
    return <InterventionFlash secondsLeft={interventionSecondsLeft} />
  }

  if (isAuthor) {
    return (
      <Screen>
        <PhaseHeader
          kicker={`matchup ${step} of ${totalSteps}`}
          title={prompt}
          sub="this one's yours"
        />
        <TimerBar secondsLeft={secondsLeft} total={total} />
        <div className="space-y-3">
          {answers.map((text, i) => (
            <AnswerOption key={i} text={text} index={i} disabled />
          ))}
        </div>
        <p className="hud mt-8 text-center text-[0.65rem] text-faint">
          you&apos;re in this matchup — sit back while the others vote
        </p>
      </Screen>
    )
  }

  return (
    <Screen>
      <PhaseHeader
        kicker={`matchup ${step} of ${totalSteps}`}
        title={prompt}
        sub={voteLocked ? 'read the answers' : 'vote for the best'}
      />

      {/* Status line: typing an intervention → reading window → live vote clock. */}
      {intervening ? (
        <div className="mx-auto mb-8 w-full max-w-2xl text-center">
          <p className="hud text-[0.68rem] text-cyan">
            ✋ you&apos;re stepping in — make it count
            {typeLeft != null && (
              <span className={typeLeft <= 5 ? 'text-rose' : 'text-cyan'}>
                {' '}
                · {typeLeft}s
              </span>
            )}
          </p>
        </div>
      ) : voteLocked ? (
        <div className="mx-auto mb-8 w-full max-w-2xl">
          <p className="hud mb-2 text-center text-[0.65rem] text-muted">
            {lockSecondsLeft != null
              ? `reading window · voting opens in ${lockSecondsLeft}s`
              : 'voting opens shortly…'}
          </p>
          <div className="h-1.5 overflow-hidden bg-surface-2">
            <div
              className="h-full bg-cyan transition-all duration-500 ease-linear"
              style={{
                width: `${
                  lockSecondsLeft != null
                    ? Math.min(100, (lockSecondsLeft / LOCK_TOTAL) * 100)
                    : 100
                }%`,
                boxShadow: '0 0 12px var(--color-cyan)',
              }}
            />
          </div>
        </div>
      ) : (
        <TimerBar secondsLeft={secondsLeft} total={total} />
      )}

      <div className="space-y-3">
        {answers.map((text, i) => (
          <AnswerOption
            key={i}
            text={text}
            index={i}
            picked={selected === i}
            dimmed={voted && selected !== i}
            disabled={voted || voteLocked}
            onClick={() => handleVote(i)}
          />
        ))}
      </div>

      {/* Step in with a better answer — only during the read window. Anonymous:
          nobody learns who stepped in until the results reveal. */}
      {(canIntervene || intervening) && (
        <div className="mt-5" data-game="cipher">
          {!intervening ? (
            <button
              onClick={handleStepIn}
              className="cut-frame block w-full bg-cyan/50 text-left transition hover:bg-cyan focus-visible:outline-none focus-visible:bg-cyan"
            >
              <span className="cut-face block bg-surface p-4">
                <span className="hud block text-[0.68rem] text-cyan">
                  ✋ i can do better
                </span>
                <span className="mt-2 block text-xs text-faint">
                  Add your own answer and wager {interventionStake}. Voting stays
                  paused until you submit. Win the most votes to take it; finish
                  dead last and you lose it. You give up your vote here.
                </span>
              </span>
            </button>
          ) : (
            <Panel tone="bg-cyan" bodyClassName="p-4 space-y-3">
              <TextArea
                value={ivText}
                onChange={(e) => setIvText(e.target.value)}
                maxLength={100}
                autoFocus
                rows={3}
                placeholder="Show them how it's done…"
              />
              <div className="flex items-baseline justify-between">
                <span className="hud text-[0.62rem] tabular-nums text-faint">
                  {String(ivText.length).padStart(3, '0')}/100
                </span>
                <span className="hud text-[0.62rem] text-cyan">
                  wager {interventionStake}
                </span>
              </div>
              <div className="flex gap-3">
                <Btn onClick={submitIntervention} disabled={!ivText.trim()}>
                  step in
                </Btn>
                <Btn variant="ghost" onClick={handleCancel} className="w-auto">
                  cancel
                </Btn>
              </div>
            </Panel>
          )}
        </div>
      )}

      {voted && (
        <p className="hud mt-8 text-center text-[0.65rem] text-faint">
          <Label accent className="inline">
            locked in
          </Label>{' '}
          · waiting for the others…
        </p>
      )}
    </Screen>
  )
}

export default Voting
