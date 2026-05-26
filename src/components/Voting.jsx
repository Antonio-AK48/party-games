import { useState } from 'react'
import TimerBar from './TimerBar'
import { sounds } from '../lib/sound'

function InterventionTag() {
  return (
    <p className="mb-2 inline-flex items-center gap-1.5 rounded-full border border-sky-400/40 bg-sky-400/10 px-3 py-1 text-xs font-bold uppercase tracking-wide text-sky-300">
      ⚡ Intervention
    </p>
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
}) {
  // votedIndex comes from the room (survives refresh); picked is the optimistic
  // local choice so the UI reacts instantly before RTDB echoes it back.
  const [picked, setPicked] = useState(votedIndex)
  const [intervening, setIntervening] = useState(false)
  const [ivText, setIvText] = useState('')
  const selected = picked ?? votedIndex
  const locked = selected != null

  const handleVote = (index) => {
    if (locked) return
    setPicked(index)
    onVote?.(index)
    sounds.vote()
  }

  const submitIntervention = () => {
    const text = ivText.trim()
    if (!text) return
    setIntervening(false)
    onIntervene?.(text)
    sounds.intervention()
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

        {/* Experimental: step in with a better answer (forfeits your vote here). */}
        {canIntervene && !locked && (
          <div className="mt-6">
            {!intervening ? (
              <button
                onClick={() => setIntervening(true)}
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
            ) : (
              <div className="rounded-2xl border border-sky-500/40 bg-sky-500/5 p-4 space-y-3">
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
                  <span>Wager {interventionStake}</span>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={submitIntervention}
                    disabled={!ivText.trim()}
                    className="flex-1 rounded-lg bg-sky-600 hover:bg-sky-500 disabled:bg-slate-800 disabled:text-slate-500 disabled:cursor-not-allowed py-3 font-semibold transition"
                  >
                    Step in
                  </button>
                  <button
                    onClick={() => setIntervening(false)}
                    className="rounded-lg border border-slate-800 hover:bg-slate-900 py-3 px-6 font-semibold transition"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
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
