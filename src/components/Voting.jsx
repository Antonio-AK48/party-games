import { useState, useEffect } from 'react'
import TimerBar from './TimerBar'
import { sounds } from '../lib/sound'

function InterventionTag() {
  return (
    <p className="mb-2 inline-flex items-center gap-1.5 rounded-full border border-sky-400/40 bg-sky-400/10 px-3 py-1 text-xs font-bold uppercase tracking-wide text-sky-300">
      ⚡ Intervention
    </p>
  )
}

// Full-screen, deliberately anonymous announcement shown to everyone except the
// person stepping in, while they write their third answer. Names no one — the
// whole point is that you don't know who challenged until the votes are revealed.
function InterventionFlash({ secondsLeft }) {
  // One dramatic swoop the moment the challenge lands.
  useEffect(() => {
    sounds.intervention()
  }, [])
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 py-12 text-center overflow-hidden">
      <div className="relative flex flex-col items-center">
        <div className="iv-flash-ring absolute -inset-16 rounded-full bg-sky-500/20 blur-2xl" />
        <div className="iv-flash-bolt text-7xl sm:text-8xl">⚡</div>
        <h2 className="iv-flash-text mt-4 text-4xl sm:text-6xl font-black tracking-tight text-sky-300">
          INTERVENTION
        </h2>
        <p className="mt-4 max-w-sm text-slate-300">
          Someone thinks they can do better — a third answer is coming.
        </p>
        {secondsLeft != null && (
          <p className="mt-6 text-sm uppercase tracking-widest text-slate-500">
            Hold your vote · {secondsLeft}s
          </p>
        )}
      </div>
    </div>
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
  // Experimental intervention (see lib/features.js):
  interventionIndex = null, // index in `answers` that is the intervention, or null
  canIntervene = false, // this player may step in on this matchup
  interventionStake = 0,
  onIntervene,
  interventionPending = false, // someone has stepped in and is writing right now
  iAmIntervener = false, // that someone is me
  onStartIntervene,
  onCancelIntervene,
}) {
  // votedIndex comes from the room (survives refresh); picked is the optimistic
  // local choice so the UI reacts instantly before RTDB echoes it back.
  const [picked, setPicked] = useState(votedIndex)
  const [intervening, setIntervening] = useState(false)
  const [ivText, setIvText] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const selected = picked ?? votedIndex
  const locked = selected != null

  // While an intervention is pending, everyone it's happening *to* sees the
  // anonymous flash and can't vote — the round is paused until the answer lands.
  if (interventionPending && !iAmIntervener) {
    return <InterventionFlash secondsLeft={secondsLeft} />
  }

  // The intervener writes in a dedicated view. Driven by RTDB pending (so it
  // survives a refresh) or the optimistic local flag the instant they tap in.
  const writing = (iAmIntervener && interventionPending) || intervening

  const handleVote = (index) => {
    if (locked) return
    setPicked(index)
    onVote?.(index)
    sounds.vote()
  }

  const beginIntervention = async () => {
    setIntervening(true)
    sounds.intervention()
    try {
      await onStartIntervene?.()
    } catch {
      setIntervening(false) // someone beat us to the one slot
    }
  }

  const submitIntervention = () => {
    const text = ivText.trim()
    if (!text) return
    setSubmitting(true)
    onIntervene?.(text)
  }

  const cancelIntervention = () => {
    setIntervening(false)
    setIvText('')
    onCancelIntervene?.()
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
                {i === interventionIndex && <InterventionTag />}
                <p className="text-lg font-medium break-words">{text}</p>
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

  // The intervener's writing view — its own screen so they can focus on the
  // answer instead of the matchup they're crashing. The timer bar here counts
  // down the writing window (total is scaled to it by the parent).
  if (writing) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6 py-12">
        <div className="w-full max-w-2xl">
          <p className="text-sky-300 text-sm font-semibold uppercase tracking-wider text-center mb-4">
            ⚡ You stepped in · Matchup {step} of {totalSteps}
          </p>
          <h2 className="text-2xl sm:text-3xl font-bold text-center mb-8 leading-tight">
            {prompt}
          </h2>

          <TimerBar secondsLeft={secondsLeft} total={total} />

          <div className="mt-6 rounded-2xl border border-sky-500/40 bg-sky-500/5 p-4 space-y-3">
            <textarea
              value={ivText}
              onChange={(e) => setIvText(e.target.value)}
              maxLength={100}
              autoFocus
              rows={3}
              placeholder="Show them how it's done…"
              className="w-full rounded-lg bg-slate-900 border border-slate-800 px-4 py-3 focus:outline-none focus:border-sky-500 transition resize-none"
            />
            <div className="flex items-center justify-between text-sm text-slate-500">
              <span>{ivText.length}/100</span>
              <span>
                Wager {interventionStake} · most votes wins it, dead last loses it
              </span>
            </div>
            <div className="flex gap-3">
              <button
                onClick={submitIntervention}
                disabled={!ivText.trim() || submitting}
                className="flex-1 rounded-lg bg-sky-600 hover:bg-sky-500 disabled:bg-slate-800 disabled:text-slate-500 disabled:cursor-not-allowed py-3 font-semibold transition"
              >
                {submitting ? 'Stepping in…' : 'Lock in my answer'}
              </button>
              <button
                onClick={cancelIntervention}
                disabled={submitting}
                className="rounded-lg border border-slate-800 hover:bg-slate-900 disabled:opacity-50 py-3 px-6 font-semibold transition"
              >
                Back out
              </button>
            </div>
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
                {i === interventionIndex && <InterventionTag />}
                <p className="text-lg font-medium break-words">{text}</p>
              </button>
            )
          })}
        </div>

        {/* Experimental: step in with a better answer (forfeits your vote here).
            Tapping this claims the one slot, pauses the round, and fires the
            anonymous flash for everyone else while you write. */}
        {canIntervene && !locked && (
          <div className="mt-6">
            <button
              onClick={beginIntervention}
              className="w-full rounded-2xl border border-sky-500/40 bg-sky-500/5 px-4 py-3 text-left transition hover:border-sky-400 hover:bg-sky-500/10"
            >
              <span className="font-semibold text-sky-300">
                ✋ I can do better
              </span>
              <span className="mt-1 block text-xs text-slate-500">
                Add your own answer and wager {interventionStake}. Win the most
                votes to take it; finish dead last and you lose it. You give up
                your vote on this matchup.
              </span>
            </button>
          </div>
        )}

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
