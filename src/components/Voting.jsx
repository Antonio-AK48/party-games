import { useState, useEffect } from 'react'
import TimerBar from './TimerBar'
import { VOTE_LOCK_MS } from '../lib/game'
import { sounds } from '../lib/sound'

const LOCK_TOTAL = VOTE_LOCK_MS / 1000

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
          Matchup {step} of {totalSteps} ·{' '}
          {voteLocked ? 'read the answers' : 'vote for the best'}
        </p>
        <h2 className="text-2xl sm:text-3xl font-bold text-center mb-10 leading-tight">
          {prompt}
        </h2>

        {/* Status line: typing an intervention → reading window → live vote clock. */}
        {intervening ? (
          <div className="w-full max-w-2xl mx-auto mb-8 text-center">
            <p className="text-sky-300 text-sm font-semibold">
              ✋ You're stepping in — make it count
              {typeLeft != null && (
                <span
                  className={`tabular-nums ${
                    typeLeft <= 5 ? 'text-red-400' : 'text-sky-300'
                  }`}
                >
                  {' '}
                  · {typeLeft}s
                </span>
              )}
            </p>
          </div>
        ) : voteLocked ? (
          <div className="w-full max-w-2xl mx-auto mb-8 text-center">
            <p className="text-slate-300 text-sm font-medium">
              {lockSecondsLeft != null
                ? `Read the answers — voting opens in ${lockSecondsLeft}s`
                : 'Voting opens shortly…'}
            </p>
            <div className="mt-3 h-1.5 bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-sky-500 transition-all duration-500 ease-linear"
                style={{
                  width: `${
                    lockSecondsLeft != null
                      ? Math.min(100, (lockSecondsLeft / LOCK_TOTAL) * 100)
                      : 100
                  }%`,
                }}
              />
            </div>
          </div>
        ) : (
          <TimerBar secondsLeft={secondsLeft} total={total} />
        )}

        <div className="space-y-4">
          {answers.map((text, i) => {
            const isPicked = selected === i
            const isDimmed = voted && !isPicked
            return (
              <button
                key={i}
                onClick={() => handleVote(i)}
                disabled={voted || voteLocked}
                className={`w-full text-left rounded-2xl border p-6 transition ${
                  isPicked
                    ? 'border-purple-500 bg-purple-950/40'
                    : voteLocked
                    ? 'border-slate-800 bg-slate-900 cursor-default'
                    : isDimmed
                    ? 'border-slate-800 bg-slate-900 opacity-40'
                    : 'border-slate-800 bg-slate-900 hover:border-slate-700 hover:bg-slate-800'
                }`}
              >
                <p className="text-lg font-medium break-words">{text}</p>
              </button>
            )
          })}
        </div>

        {/* Step in with a better answer — only during the read window. Anonymous:
            nobody learns who stepped in until the results reveal. */}
        {(canIntervene || intervening) && (
          <div className="mt-6">
            {!intervening ? (
              <button
                onClick={handleStepIn}
                className="w-full rounded-2xl border border-sky-500/40 bg-sky-500/5 px-4 py-3 text-left transition hover:border-sky-400 hover:bg-sky-500/10"
              >
                <span className="font-semibold text-sky-300">
                  ✋ I can do better
                </span>
                <span className="mt-1 block text-xs text-slate-500">
                  Add your own answer and wager {interventionStake}. Voting stays
                  paused until you submit. Win the most votes to take it; finish
                  dead last and you lose it. You give up your vote here.
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
                    onClick={handleCancel}
                    className="rounded-lg border border-slate-800 hover:bg-slate-900 py-3 px-6 font-semibold transition"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {voted && (
          <p className="text-center text-slate-400 mt-8">
            Locked in. Waiting for the others…
          </p>
        )}
      </div>
    </div>
  )
}

export default Voting
