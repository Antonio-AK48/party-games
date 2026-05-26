import { CODE_LENGTH, KEYWORDS_PER_TEAM, toArr, isValidCode } from '../lib/cipher'

// Phase: cipher-guessing. Both teams see both sets of clues. Each team picks
// two codes — their own code (easy — they know their keywords) and the
// opposing team's code (the actual intercept attempt). Guess state is held in
// RTDB so all teammates see each other's clicks live; "Submit" calls lockGuess.

function DigitButton({ digit, selected, disabled, onClick, theme }) {
  return (
    <button
      type="button"
      onClick={() => onClick(digit)}
      disabled={disabled}
      className={`flex-1 rounded-lg border py-3 text-xl font-bold tabular-nums transition ${
        selected
          ? `${theme.pillBorder} ${theme.pillBg} ${theme.accent}`
          : disabled
          ? 'border-slate-800 bg-slate-900 text-slate-600 cursor-not-allowed'
          : 'border-slate-800 bg-slate-900 text-slate-300 hover:border-slate-700 hover:bg-slate-800'
      }`}
    >
      {digit}
    </button>
  )
}

function CodeRow({ slots, onSet, disabled, theme }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: CODE_LENGTH }).map((_, slotIdx) => (
        <div key={slotIdx} className="flex items-center gap-2">
          <span className="w-6 text-center text-slate-500 text-sm tabular-nums">
            #{slotIdx + 1}
          </span>
          <div className="flex flex-1 gap-2">
            {Array.from({ length: KEYWORDS_PER_TEAM }).map((_, d) => {
              const digit = d + 1
              return (
                <DigitButton
                  key={digit}
                  digit={digit}
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

function ClueList({ label, theme, clues, keywords }) {
  const arr = toArr(clues)
  return (
    <div className={`rounded-2xl border p-4 ${theme.border} ${theme.bg}`}>
      <p
        className={`text-xs uppercase tracking-[0.3em] font-semibold mb-3 ${theme.accent}`}
      >
        {label} clues
      </p>
      <ol className="space-y-2">
        {Array.from({ length: CODE_LENGTH }).map((_, i) => (
          <li key={i} className="flex items-baseline gap-3">
            <span className={`text-lg font-bold tabular-nums ${theme.accent}`}>
              #{i + 1}
            </span>
            <span className="text-lg font-medium break-words">
              {arr[i] || <span className="text-slate-600">—</span>}
            </span>
          </li>
        ))}
      </ol>
      {keywords && (
        <p className="mt-3 text-xs text-slate-500">
          Your keywords: {keywords.map((k, i) => `${i + 1}: ${k}`).join('  ')}
        </p>
      )}
    </div>
  )
}

function CipherGuessing({
  mySide,
  myTeam,
  currentRound,
  themeA,
  themeB,
  onUpdateGuess,
  onLockGuess,
}) {
  const cluesA = currentRound.clues?.A
  const cluesB = currentRound.clues?.B
  const myKeywords = toArr(myTeam?.keywords)

  const myGuessNode = mySide
    ? currentRound.guesses?.[mySide]
    : null
  const own = toArr(myGuessNode?.own).map((v) => (v ? Number(v) : null))
  const opp = toArr(myGuessNode?.opp).map((v) => (v ? Number(v) : null))
  // Normalise to fixed-length CODE_LENGTH arrays (null = unfilled).
  const ownSlots = Array.from({ length: CODE_LENGTH }, (_, i) => own[i] || null)
  const oppSlots = Array.from({ length: CODE_LENGTH }, (_, i) => opp[i] || null)
  const locked = !!myGuessNode?.locked
  const canLock = isValidCode(ownSlots) && isValidCode(oppSlots) && !locked

  const handleSet = (which) => (slotIdx, digit) => {
    if (locked) return
    const nextOwn = which === 'own' ? setSlot(ownSlots, slotIdx, digit) : ownSlots
    const nextOpp = which === 'opp' ? setSlot(oppSlots, slotIdx, digit) : oppSlots
    // Strip nulls (Firebase prefers arrays without holes); store 0 as placeholder.
    onUpdateGuess(
      nextOwn.map((v) => v || 0),
      nextOpp.map((v) => v || 0),
    )
  }

  const myTheme = mySide === 'A' ? themeA : mySide === 'B' ? themeB : null
  const oppLabel = mySide === 'A' ? 'Team B' : 'Team A'
  const oppTheme = mySide === 'A' ? themeB : themeA

  return (
    <div className="space-y-5">
      <div className="grid sm:grid-cols-2 gap-3">
        <ClueList
          label="Team A"
          theme={themeA}
          clues={cluesA}
          keywords={mySide === 'A' ? myKeywords : null}
        />
        <ClueList
          label="Team B"
          theme={themeB}
          clues={cluesB}
          keywords={mySide === 'B' ? myKeywords : null}
        />
      </div>

      {mySide ? (
        <div className={`rounded-2xl border p-5 ${myTheme.border} ${myTheme.bg}`}>
          <p
            className={`text-xs uppercase tracking-[0.3em] font-semibold mb-3 ${myTheme.accent}`}
          >
            Your team's guess
          </p>

          <div className="space-y-5">
            <div>
              <p className="text-sm text-slate-300 mb-2">
                Our code (we know our keywords)
              </p>
              <CodeRow
                slots={ownSlots}
                onSet={handleSet('own')}
                disabled={locked}
                theme={myTheme}
              />
            </div>
            <div>
              <p className="text-sm text-slate-300 mb-2">
                {oppLabel}'s code{' '}
                <span className="text-slate-500">
                  (intercept attempt — pattern-match from clues)
                </span>
              </p>
              <CodeRow
                slots={oppSlots}
                onSet={handleSet('opp')}
                disabled={locked}
                theme={oppTheme}
              />
            </div>
          </div>

          <button
            onClick={onLockGuess}
            disabled={!canLock}
            className="mt-5 w-full rounded-lg bg-purple-600 hover:bg-purple-500 disabled:bg-slate-800 disabled:text-slate-500 disabled:cursor-not-allowed py-3 font-semibold transition"
          >
            {locked
              ? 'Locked in — waiting for the other team…'
              : 'Submit guesses'}
          </button>
          {!locked && (
            <p className="mt-2 text-xs text-slate-500 text-center">
              Anyone on your team can edit. Latest click wins. Lock when ready.
            </p>
          )}
        </div>
      ) : (
        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6 text-center">
          <p className="text-slate-400">Both teams are guessing…</p>
        </div>
      )}
    </div>
  )
}

export default CipherGuessing
