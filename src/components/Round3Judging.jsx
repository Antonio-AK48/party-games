import { useState } from 'react'
import TimerBar from './TimerBar'
import { sounds } from '../lib/sound'
import { Screen, PhaseHeader } from './ui'

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
    <Screen>
      <PhaseHeader
        kicker={`prompt ${step} of ${totalSteps} · author's cut`}
        title={prompt}
        sub={
          isAuthor
            ? 'your prompt — pick the funniest'
            : `${judgeName} is choosing the funniest`
        }
      />

      <TimerBar secondsLeft={secondsLeft} total={total} />

      <div className="space-y-3">
        {answers.map((text, i) => {
          const isPicked = selected === i
          const isDimmed = locked && !isPicked
          const frame = isPicked
            ? 'bg-[var(--accent)] shadow-[var(--accent-glow)]'
            : 'bg-line'
          const face = isPicked
            ? 'bg-[var(--accent)]/12'
            : isDimmed
              ? 'bg-surface opacity-40'
              : 'bg-surface'
          const body = (
            <>
              <span className="hud absolute left-4 top-3 text-[0.6rem] text-faint">
                {String.fromCharCode(65 + i)}
              </span>
              <p className="pl-7 text-lg font-medium break-words">{text}</p>
            </>
          )
          return isAuthor ? (
            <button
              key={i}
              onClick={() => handlePick(i)}
              disabled={locked}
              className={`cut-frame block w-full text-left transition hover:bg-line-bright focus-visible:outline-none focus-visible:bg-[var(--accent)] ${frame}`}
            >
              <span className={`cut-face relative block p-5 transition ${face}`}>
                {body}
              </span>
            </button>
          ) : (
            <div key={i} className={`cut-frame transition ${frame}`}>
              <div className={`cut-face relative p-5 transition ${face}`}>
                {body}
              </div>
            </div>
          )
        })}
      </div>

      <p className="hud mt-8 text-center text-[0.65rem] text-faint">
        {locked
          ? isAuthor
            ? 'locked in.'
            : `${judgeName} picked their winner`
          : isAuthor
            ? "pick when you're ready"
            : 'waiting on the judge…'}
      </p>
    </Screen>
  )
}

export default Round3Judging
