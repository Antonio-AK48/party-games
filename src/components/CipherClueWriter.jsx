import { useState } from 'react'
import { CODE_LENGTH, toArr } from '../lib/cipher'

// Phase: cipher-clues. Three views depending on who's looking:
//   1. You ARE this round's encryptor on your team → write 3 clues for the
//      digits in your team's code (only YOU see the code).
//   2. You're on a team but you're NOT the encryptor → can see your team's
//      keywords elsewhere on screen, but the code + clue inputs are hidden so
//      you don't peek. Just wait.
//   3. You're on the OPPOSING team → wait for both encryptors to finish.
function CipherClueWriter({
  mySide,
  myTeam,
  opponentEncryptorName,
  currentRound,
  myUid,
  onSubmitClues,
  myTheme,
}) {
  const myEncryptorUid = mySide === 'A' ? currentRound.encryptors?.A : currentRound.encryptors?.B
  const isMyTeamEncryptor = myUid === myEncryptorUid
  const myCode = toArr(mySide === 'A' ? currentRound.codes?.A : currentRound.codes?.B)
  const myCluesSubmitted = !!(mySide === 'A'
    ? currentRound.clues?.A
    : currentRound.clues?.B)
  const oppCluesSubmitted = !!(mySide === 'A'
    ? currentRound.clues?.B
    : currentRound.clues?.A)
  const myKeywords = toArr(myTeam?.keywords)

  const [clues, setClues] = useState(['', '', ''])
  const [submitting, setSubmitting] = useState(false)

  const canSubmit =
    clues.every((c) => c.trim().length > 0) && !submitting && !myCluesSubmitted

  const handleSubmit = async () => {
    if (!canSubmit) return
    setSubmitting(true)
    try {
      await onSubmitClues(clues.map((c) => c.trim()))
    } finally {
      setSubmitting(false)
    }
  }

  // ---- View 3: spectator (no team) — just a wait screen ---------------------
  if (!mySide) {
    return (
      <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6 text-center">
        <p className="text-slate-400">
          Both encryptors are writing clues for their team…
        </p>
      </div>
    )
  }

  // ---- View 1: you're the encryptor — write the clues ----------------------
  if (isMyTeamEncryptor && !myCluesSubmitted) {
    return (
      <div className={`rounded-2xl border p-6 ${myTheme.border} ${myTheme.bg}`}>
        <p
          className={`text-xs uppercase tracking-[0.3em] font-semibold mb-2 ${myTheme.accent}`}
        >
          Your team's code
        </p>
        <p className="text-slate-400 text-sm mb-4">
          Write one clue per digit. Your teammates need to crack it. Don't let
          the other team figure out the pattern!
        </p>
        <div className="space-y-4">
          {Array.from({ length: CODE_LENGTH }).map((_, i) => {
            const digit = myCode[i]
            const kw = myKeywords[digit - 1]
            return (
              <div
                key={i}
                className={`rounded-xl border ${myTheme.pillBorder} ${myTheme.pillBg} p-4`}
              >
                <div className="flex items-center gap-3 mb-2">
                  <span
                    className={`text-3xl font-black tabular-nums ${myTheme.accent}`}
                  >
                    {digit}
                  </span>
                  <span className="text-lg font-semibold text-slate-300">
                    → hint at <span className="text-white">{kw}</span>
                  </span>
                </div>
                <input
                  type="text"
                  value={clues[i]}
                  onChange={(e) =>
                    setClues((prev) => {
                      const next = [...prev]
                      next[i] = e.target.value
                      return next
                    })
                  }
                  maxLength={40}
                  placeholder="Clue…"
                  className="w-full rounded-lg bg-slate-950/50 border border-slate-800 px-3 py-2 focus:outline-none focus:border-purple-500 transition"
                />
              </div>
            )
          })}
        </div>
        <button
          onClick={handleSubmit}
          disabled={!canSubmit}
          className="mt-5 w-full rounded-lg bg-purple-600 hover:bg-purple-500 disabled:bg-slate-800 disabled:text-slate-500 disabled:cursor-not-allowed py-3 font-semibold transition"
        >
          {submitting ? 'Submitting…' : 'Submit clues'}
        </button>
      </div>
    )
  }

  // ---- View 1.5: you submitted, waiting on the other encryptor -------------
  if (isMyTeamEncryptor && myCluesSubmitted) {
    return (
      <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6 text-center">
        <p className="text-slate-300 font-semibold mb-1">Clues locked in.</p>
        <p className="text-slate-500 text-sm">
          {oppCluesSubmitted
            ? 'Opening guessing…'
            : `Waiting for ${opponentEncryptorName} to finish…`}
        </p>
      </div>
    )
  }

  // ---- View 2: you're on a team but not encrypting -------------------------
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6 text-center">
      <p className="text-slate-300 font-semibold mb-1">
        Your encryptor is writing clues
      </p>
      <p className="text-slate-500 text-sm">
        Look away from their screen! Your team's keywords are above for when it's
        guessing time.
      </p>
    </div>
  )
}

export default CipherClueWriter
