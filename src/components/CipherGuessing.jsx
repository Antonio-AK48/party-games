import { CODE_LENGTH, KEYWORDS_PER_TEAM, toArr, isValidCode } from '../lib/cipher'
import { Panel, Btn, Label } from './ui'

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
      style={{ '--cut': '7px' }}
      className={`cut border px-2 py-3 transition break-words ${
        isWord ? 'text-sm font-semibold leading-tight' : 'hud text-xl tabular-nums'
      } ${
        selected
          ? `${theme.pillBorder} ${theme.pillBg} ${theme.accent}`
          : disabled
            ? 'border-line bg-surface text-faint cursor-not-allowed'
            : 'border-line bg-surface text-muted hover:border-line-bright hover:bg-surface-2 hover:text-bright'
      }`}
    >
      {isWord && (
        <span className="hud mb-1 block text-[0.55rem] tabular-nums text-faint">
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
          style={{ '--cut': '9px' }}
          className="cut border border-line bg-surface/60 p-3"
        >
          <p className="mb-2.5 flex items-baseline gap-2">
            <span className="hud text-[0.6rem] tabular-nums text-faint">
              #{slotIdx + 1}
            </span>
            <span className="font-semibold text-bright break-words">
              {clueArr[slotIdx] || <span className="text-faint">—</span>}
            </span>
          </p>
          <div
            className={`grid gap-2 ${isWords ? 'grid-cols-2 sm:grid-cols-4' : 'grid-cols-4'}`}
          >
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
      <Panel bodyClassName="p-6 text-center">
        <p className="text-muted">Both teams are guessing…</p>
      </Panel>
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
      <Panel ticks bodyClassName="p-6 text-center">
        <Label accent className="mb-2">
          locked in
        </Label>
        <p className="text-sm text-faint">Waiting for the other team…</p>
      </Panel>
    )
  }

  // ---- Step 2: intercept (round 2+, once our own code is committed) ---------
  // Enemy keywords are secret, so this picker is numeric — you're guessing which
  // of their four hidden keyword slots each clue points to.
  if (ownLocked && !isFirstRound) {
    return (
      <div className="space-y-4">
        <Panel sm bodyClassName="flex items-center justify-between p-3">
          <span className="hud text-[0.62rem] text-faint">your code · locked</span>
          <span className={`hud text-lg tabular-nums ${myTheme.accent}`}>
            {ownSlots.join('-')}
          </span>
        </Panel>

        <div data-team={oppTheme.team} className={`cut-frame ${oppTheme.frame}`}>
          <div className={`cut-face ticks relative p-5 ${oppTheme.face}`}>
            <p className={`hud mb-2 text-[0.68rem] ${oppTheme.accent}`}>
              ▸ intercept {oppLabel}&apos;s code
            </p>
            <p className="mb-4 text-sm text-muted">
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
            <Btn onClick={onLockGuess} disabled={!canIntercept} className="mt-5">
              submit intercept
            </Btn>
            <p className="hud mt-3 text-center text-[0.55rem] text-faint">
              anyone on your team can edit · latest click wins
            </p>
          </div>
        </div>
      </div>
    )
  }

  // ---- Step 1: decode our own code (enemy clues stay hidden) ----------------
  // You know your own keywords, so you match each clue to a keyword BY WORD.
  return (
    <div className="space-y-4">
      {isMyTeamEncryptor ? (
        // You wrote these clues — you already know the code, so you can't help
        // decode it. Wait for the team, then you'll join the intercept.
        <Panel bodyClassName="p-6 text-center">
          <Label accent className="mb-2">
            you encrypted this round
          </Label>
          <p className="text-sm text-faint">
            You know the code — your teammates have to decode it.{' '}
            {isFirstRound
              ? 'Sit tight while they lock it in.'
              : "Once they commit, you'll join the intercept."}
          </p>
        </Panel>
      ) : (
        <div data-team={myTheme.team} className={`cut-frame ${myTheme.frame}`}>
          <div className={`cut-face ticks relative p-5 ${myTheme.face}`}>
            <p className={`hud mb-2 text-[0.68rem] ${myTheme.accent}`}>
              ▸ decode your own code
            </p>
            <p className="mb-4 text-sm text-muted">
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
            <Btn
              onClick={isFirstRound ? onLockGuess : onLockOwn}
              disabled={!canLockOwn}
              className="mt-5"
            >
              {isFirstRound ? 'submit our guess' : 'lock code & see their clues'}
            </Btn>
            <p className="hud mt-3 text-center text-[0.55rem] text-faint">
              {isFirstRound
                ? 'round 1 is intel-only — no interception yet'
                : `${oppLabel}'s clues stay hidden until you commit`}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

export default CipherGuessing
