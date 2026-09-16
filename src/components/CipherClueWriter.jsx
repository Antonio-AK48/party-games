import { useState } from 'react'
import { CODE_LENGTH, toArr } from '../lib/cipher'
import { Panel, Btn, Label } from './ui'

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
      <Panel bodyClassName="p-6 text-center">
        <p className="text-muted">
          Both encryptors are writing clues for their team…
        </p>
      </Panel>
    )
  }

  // ---- View 1: you're the encryptor — write the clues ----------------------
  if (isMyTeamEncryptor && !myCluesSubmitted) {
    return (
      <div data-team={myTheme.team} className={`cut-frame ${myTheme.frame}`}>
        <div className={`cut-face ticks relative p-6 ${myTheme.face}`}>
          <p className={`hud mb-2 text-[0.68rem] ${myTheme.accent}`}>
            ▸ your team&apos;s code · eyes only
          </p>
          <p className="mb-5 text-sm text-muted">
            Write one clue per digit. Your teammates need to crack it. Don&apos;t
            let the other team figure out the pattern.
          </p>
          <div className="space-y-3">
            {Array.from({ length: CODE_LENGTH }).map((_, i) => {
              const digit = myCode[i]
              const kw = myKeywords[digit - 1]
              return (
                <div
                  key={i}
                  style={{ '--cut': '9px' }}
                  className={`cut border p-4 ${myTheme.pillBorder} ${myTheme.pillBg}`}
                >
                  <div className="mb-3 flex items-center gap-3">
                    <span
                      className={`hud text-3xl leading-none tabular-nums ${myTheme.accent}`}
                    >
                      {digit}
                    </span>
                    <span className="text-base text-muted">
                      hint at{' '}
                      <span className="font-bold text-bright">{kw}</span>
                    </span>
                  </div>
                  <div className="cut-frame cut-sm bg-line transition focus-within:bg-[var(--accent)]">
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
                      className="cut-face min-h-11 w-full bg-surface px-3 py-3 text-bright placeholder:text-faint focus:outline-none"
                    />
                  </div>
                </div>
              )
            })}
          </div>
          <Btn onClick={handleSubmit} disabled={!canSubmit} className="mt-5">
            {submitting ? 'transmitting…' : 'submit clues'}
          </Btn>
        </div>
      </div>
    )
  }

  // ---- View 1.5: you submitted, waiting on the other encryptor -------------
  if (isMyTeamEncryptor && myCluesSubmitted) {
    return (
      <Panel ticks bodyClassName="p-6 text-center">
        <Label accent className="mb-2">
          clues locked in
        </Label>
        <p className="text-sm text-faint">
          {oppCluesSubmitted
            ? 'Opening guessing…'
            : `Waiting for ${opponentEncryptorName} to finish…`}
        </p>
      </Panel>
    )
  }

  // ---- View 2: you're on a team but not encrypting -------------------------
  return (
    <Panel bodyClassName="p-6 text-center">
      <Label accent className="mb-2">
        your encryptor is writing clues
      </Label>
      <p className="text-sm text-faint">
        Look away from their screen. Your team&apos;s keywords are above for when
        it&apos;s guessing time.
      </p>
    </Panel>
  )
}

export default CipherClueWriter
