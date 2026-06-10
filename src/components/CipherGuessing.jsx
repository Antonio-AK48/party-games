import { CODE_LENGTH, KEYWORDS_PER_TEAM, toArr, isValidCode } from '../lib/cipher'

// Phase: cipher-guessing, run as two gated steps so a team commits its own
// decode BEFORE it ever sees the enemy's clues (authentic Decrypto order, and it
// stops one team from peeking at the other's clues while decoding their own):
//   Step 1 — Decode: only your own clues are shown; lock your own code. Because
//            you know your own keywords, you pick them BY WORD (not by number).
//   Step 2 — Intercept (round 2+): now the opponent's clues appear; guess their
//            code. You don't know their keywords, so this stays numeric (1–4).
// Round 1 is intel-only, so it ends after step 1. The step is driven by the
// shared guess node (own / ownLocked / opp / locked) so every teammate advances
// together; "Submit" calls lockGuess and the host scores once both teams lock.

// A single keyword choice for one clue slot. `label` is what's shown (the keyword
// word in decode, or the bare number when intercepting an unknown enemy keyword);
// `digit` is always the underlying 1–4 value written to the code.
function ChoiceButton({ label, digit, isWord, selected, disabled, onClick, theme }) {
  return (
    <button
      type="button"
      onClick={() => onClick(digit)}
      disabled={disabled}
      className={`rounded-lg border px-2 py-3 transition break-words ${
        isWord ? 'text-sm font-semibold leading-tight' : 'text-xl font-bold tabular-nums'
      } ${
        selected
          ? `${theme.pillBorder} ${theme.pillBg} ${theme.accent}`
          : disabled
          ? 'border-slate-800 bg-slate-900 text-slate-600 cursor-not-allowed'
          : 'border-slate-800 bg-slate-900 text-slate-300 hover:border-slate-700 hover:bg-slate-800'
      }`}
    >
      {isWord && (
        <span className="block text-[10px] text-slate-500 tabular-nums mb-0.5">
          {digit}
        </span>
      )}
      {label}
    </button>
  )
}

// One block per clue: the clue text on top, the keyword choices below it — so the
// clue and the answer you're picking for it sit together. `buttonLabels` is the
// per-digit display (keyword words) or null for a numeric (1–4) picker.
function CodeRow({ slots, onSet, disabled, theme, clues, buttonLabels }) {
  const isWords = Array.isArray(buttonLabels)
  const clueArr = toArr(clues)
  return (
    <div className="space-y-3">
      {Array.from({ length: CODE_LENGTH }).map((_, slotIdx) => (
        <div
          key={slotIdx}
          className="rounded-xl border border-slate-800 bg-slate-900/40 p-3"
        >
          <p className="mb-2 flex items-baseline gap-2">
            <span className="text-slate-500 text-sm tabular-nums">
              #{slotIdx + 1}
            </span>
            <span className="font-semibold text-slate-100 break-words">
              {clueArr[slotIdx] || <span className="text-slate-600">—</span>}
            </span>
          </p>
          <div className={`grid gap-2 ${isWords ? 'grid-cols-2 sm:grid-cols-4' : 'grid-cols-4'}`}>
            {Array.from({ length: KEYWORDS_PER_TEAM }).map((_, d) => {
              const digit = d + 1
              return (
                <ChoiceButton
                  key={digit}
                  label={isWords ? buttonLabels[d] ?? digit : digit}
                  digit={digit}
                  isWord={isWords}
                  selected={slots[slotIdx] === digit}
                  disabled={disabled}
                  onClick={(v) => onSet(slotIdx, v)}
                  theme={theme}
                />
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}

// Replace a slot with `digit`. If `digit` is already in another slot of this
// code, swap them (so the code stays a permutation without manual clearing).
function setSlot(slots, slotIdx, digit) {
  const next = [...slots]
  const existing = next.indexOf(digit)
  if (existing >= 0 && existing !== slotIdx) {
    next[existing] = next[slotIdx] || null
  }
  next[slotIdx] = digit
  return next
}

function CipherGuessing({
  mySide,
  myTeam,
  currentRound,
  round,
  myUid,
  themeA,
  themeB,
  onUpdateGuess,
  onLockOwn,
  onLockGuess,
}) {
  const cluesA = currentRound.clues?.A
  const cluesB = currentRound.clues?.B
  const myKeywords = toArr(myTeam?.keywords)

  // Round 1 is intel-only: no interception, so the guess ends at step 1.
  const isFirstRound = (round || 1) <= 1

  // Spectators (no team) just wait it out.
  if (!mySide) {
    return (
      <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6 text-center">
        <p className="text-slate-400">Both teams are guessing…</p>
      </div>
    )
  }

  const myTheme = mySide === 'A' ? themeA : themeB
  const oppLabel = mySide === 'A' ? 'Team B' : 'Team A'
  const oppTheme = mySide === 'A' ? themeB : themeA
  const myClues = mySide === 'A' ? cluesA : cluesB
  const oppClues = mySide === 'A' ? cluesB : cluesA

  // The encryptor wrote the clues and knows the code, so they sit out their own
  // team's decode (step 1) — only the rest of the team cracks it. They DO rejoin
  // for the intercept (step 2), where they don't know the enemy's code.
  const isMyTeamEncryptor = myUid && myUid === currentRound.encryptors?.[mySide]

  const myGuessNode = currentRound.guesses?.[mySide]
  const own = toArr(myGuessNode?.own).map((v) => (v ? Number(v) : null))
  const opp = toArr(myGuessNode?.opp).map((v) => (v ? Number(v) : null))
  // Normalise to fixed-length CODE_LENGTH arrays (null = unfilled).
  const ownSlots = Array.from({ length: CODE_LENGTH }, (_, i) => own[i] || null)
  const oppSlots = Array.from({ length: CODE_LENGTH }, (_, i) => opp[i] || null)
  const ownLocked = !!myGuessNode?.ownLocked
  const locked = !!myGuessNode?.locked

  const handleSet = (which) => (slotIdx, digit) => {
    if (locked) return
    if (which === 'own' && ownLocked) return // own committed before enemy clues
    if (which === 'own' && isMyTeamEncryptor) return // encryptor can't decode own
    const nextOwn = which === 'own' ? setSlot(ownSlots, slotIdx, digit) : ownSlots
    const nextOpp = which === 'opp' ? setSlot(oppSlots, slotIdx, digit) : oppSlots
    // Strip nulls (Firebase prefers arrays without holes); store 0 as placeholder.
    onUpdateGuess(
      nextOwn.map((v) => v || 0),
      nextOpp.map((v) => v || 0),
    )
  }

  const canLockOwn = isValidCode(ownSlots) && !ownLocked && !locked
  const canIntercept = ownLocked && isValidCode(oppSlots) && !locked

  // ---- Final state: locked, waiting on the other team ----------------------
  if (locked) {
    return (
      <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6 text-center">
        <p className="text-slate-300 font-semibold mb-1">Locked in.</p>
        <p className="text-slate-500 text-sm">Waiting for the other team…</p>
      </div>
    )
  }

  // ---- Step 2: intercept (round 2+, once our own code is committed) ---------
  // Enemy keywords are secret, so this picker is numeric — you're guessing which
  // of their four hidden keyword slots each clue points to.
  if (ownLocked && !isFirstRound) {
    return (
      <div className="space-y-5">
        <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-3 text-sm flex items-center justify-between">
          <span className="text-slate-400">Your code — locked</span>
          <span className={`tabular-nums font-bold text-lg ${myTheme.accent}`}>
            {ownSlots.join('-')}
          </span>
        </div>

        <div className={`rounded-2xl border p-5 ${oppTheme.border} ${oppTheme.bg}`}>
          <p
            className={`text-xs uppercase tracking-[0.3em] font-semibold mb-2 ${oppTheme.accent}`}
          >
            Intercept {oppLabel}'s code
          </p>
          <p className="text-sm text-slate-400 mb-3">
            For each clue, pick which of their keyword slots (1–4) you think it
            points to.
          </p>
          <CodeRow
            slots={oppSlots}
            onSet={handleSet('opp')}
            disabled={false}
            theme={oppTheme}
            clues={oppClues}
            buttonLabels={null}
          />
          <button
            onClick={onLockGuess}
            disabled={!canIntercept}
            className="mt-5 w-full rounded-lg bg-purple-600 hover:bg-purple-500 disabled:bg-slate-800 disabled:text-slate-500 disabled:cursor-not-allowed py-3 font-semibold transition"
          >
            Submit intercept
          </button>
          <p className="mt-2 text-xs text-slate-500 text-center">
            Anyone on your team can edit. Latest click wins. Lock when ready.
          </p>
        </div>
      </div>
    )
  }

  // ---- Step 1: decode our own code (enemy clues stay hidden) ----------------
  // You know your own keywords, so you match each clue to a keyword BY WORD.
  return (
    <div className="space-y-5">
      {isMyTeamEncryptor ? (
        // You wrote these clues — you already know the code, so you can't help
        // decode it. Wait for the team, then you'll join the intercept.
        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6 text-center">
          <p className="text-slate-300 font-semibold mb-1">
            You encrypted this round
          </p>
          <p className="text-slate-500 text-sm">
            You know the code — your teammates have to decode it.{' '}
            {isFirstRound
              ? 'Sit tight while they lock it in.'
              : "Once they commit, you'll join the intercept."}
          </p>
        </div>
      ) : (
        <div className={`rounded-2xl border p-5 ${myTheme.border} ${myTheme.bg}`}>
          <p
            className={`text-xs uppercase tracking-[0.3em] font-semibold mb-2 ${myTheme.accent}`}
          >
            Decode your own code
          </p>
          <p className="text-sm text-slate-400 mb-3">
            For each clue, tap the keyword you think your encryptor meant.
          </p>
          <CodeRow
            slots={ownSlots}
            onSet={handleSet('own')}
            disabled={false}
            theme={myTheme}
            clues={myClues}
            buttonLabels={myKeywords}
          />
          <button
            onClick={isFirstRound ? onLockGuess : onLockOwn}
            disabled={!canLockOwn}
            className="mt-5 w-full rounded-lg bg-purple-600 hover:bg-purple-500 disabled:bg-slate-800 disabled:text-slate-500 disabled:cursor-not-allowed py-3 font-semibold transition"
          >
            {isFirstRound ? 'Submit our guess' : "Lock our code & see their clues"}
          </button>
          <p className="mt-2 text-xs text-slate-500 text-center">
            {isFirstRound
              ? 'Round 1 is intel-only — no interception yet.'
              : `${oppLabel}'s clues stay hidden until you commit your own code.`}
          </p>
        </div>
      )}
    </div>
  )
}

export default CipherGuessing
