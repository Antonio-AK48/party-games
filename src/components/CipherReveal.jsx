import { CODE_LENGTH, toArr } from '../lib/cipher'
import { Pill, Label } from './ui'

// Phase: cipher-reveal. Show what actually happened this round — the real
// codes, both teams' guesses side-by-side with each, and any tokens earned.

function CodePill({ digits, theme, highlight }) {
  const arr = toArr(digits)
  return (
    <div className="inline-flex gap-1.5">
      {arr.map((d, i) => (
        <span
          key={i}
          style={{ '--cut': '5px' }}
          className={`cut hud flex h-9 w-9 items-center justify-center border text-lg tabular-nums ${
            highlight
              ? `${theme.pillBorder} ${theme.pillBg} ${theme.accent}`
              : 'border-line bg-surface text-muted'
          }`}
        >
          {d}
        </span>
      ))}
    </div>
  )
}

function GuessRow({ label, guess, code, theme }) {
  const correct = (() => {
    const a = toArr(guess).map(Number)
    const b = toArr(code).map(Number)
    if (a.length !== b.length || a.length === 0) return false
    return a.every((v, i) => v === b[i])
  })()
  return (
    <div className="flex items-center justify-between gap-3 py-1.5">
      <span className="hud text-[0.58rem] text-faint">{label}</span>
      <div className="flex items-center gap-2">
        <CodePill digits={guess} theme={theme} highlight={correct} />
        <span className={`text-lg ${correct ? 'text-lime' : 'text-rose'}`}>
          {correct ? '✓' : '✗'}
        </span>
      </div>
    </div>
  )
}

function TeamPanel({
  label,
  theme,
  clues,
  code,
  guessesByOther,
  resultForThisTeam,
  intelOnly,
}) {
  return (
    <div data-team={theme.team} className={`cut-frame ${theme.frame}`}>
      <div className={`cut-face ticks relative p-5 ${theme.face}`}>
        <div className="mb-4 flex items-center justify-between gap-3 pr-6">
          <p className={`hud text-[0.68rem] ${theme.accent}`}>{label}</p>
          <div className="flex items-center gap-2">
            <span className="hud text-[0.55rem] text-faint">code</span>
            <CodePill digits={code} theme={theme} highlight />
          </div>
        </div>

        <ol className="mb-4 space-y-2">
          {Array.from({ length: CODE_LENGTH }).map((_, i) => (
            <li key={i} className="flex items-baseline gap-3">
              <span className={`hud shrink-0 text-sm tabular-nums ${theme.accent}`}>
                {i + 1}→{toArr(code)[i]}
              </span>
              <span className="min-w-0 break-words text-muted">
                {toArr(clues)[i]}
              </span>
            </li>
          ))}
        </ol>

        <div className="space-y-1 border-t border-line pt-3">
          <GuessRow
            label={`${label} own guess`}
            guess={guessesByOther.ownByOwner}
            code={code}
            theme={theme}
          />
          {intelOnly ? (
            <p className="hud py-1.5 text-[0.55rem] text-faint">
              no intercept attempt · round 1 is intel-only
            </p>
          ) : (
            <GuessRow
              label="intercept attempt"
              guess={guessesByOther.oppByOther}
              code={code}
              theme={theme}
            />
          )}
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {resultForThisTeam.gotIntercept && (
            <Pill tone="good">🎯 intercepted</Pill>
          )}
          {resultForThisTeam.gotMiscom && (
            <Pill tone="bad">💥 miscommunication</Pill>
          )}
          {!resultForThisTeam.gotIntercept && !resultForThisTeam.gotMiscom && (
            <Pill tone="neutral">clean round</Pill>
          )}
        </div>
      </div>
    </div>
  )
}

function CipherReveal({ currentRound, round, themeA, themeB }) {
  const result = currentRound?.result || { A: {}, B: {} }
  // Round 1 is intel-only — no interception happened, so hide the empty attempt.
  const intelOnly = (round || 1) <= 1
  return (
    <div className="space-y-4">
      <Label className="text-center">
        round reveal{intelOnly ? ' · intel only' : ''}
      </Label>
      <div className="grid gap-3 sm:grid-cols-2">
        <TeamPanel
          label="Team A"
          theme={themeA}
          intelOnly={intelOnly}
          clues={currentRound.clues?.A}
          code={currentRound.codes?.A}
          guessesByOther={{
            // Team A's guess of their own code
            ownByOwner: currentRound.guesses?.A?.own,
            // Team B's intercept attempt at Team A's code
            oppByOther: currentRound.guesses?.B?.opp,
          }}
          resultForThisTeam={{
            // Team A took a miscom by failing to guess A's code
            gotMiscom: result.A?.gotMiscom,
            // Team B took an intercept by guessing A's code
            gotIntercept: result.B?.gotIntercept,
          }}
        />
        <TeamPanel
          label="Team B"
          theme={themeB}
          intelOnly={intelOnly}
          clues={currentRound.clues?.B}
          code={currentRound.codes?.B}
          guessesByOther={{
            ownByOwner: currentRound.guesses?.B?.own,
            oppByOther: currentRound.guesses?.A?.opp,
          }}
          resultForThisTeam={{
            gotMiscom: result.B?.gotMiscom,
            gotIntercept: result.A?.gotIntercept,
          }}
        />
      </div>
      <p className="hud text-center text-[0.6rem] text-faint">
        next round coming up…
      </p>
    </div>
  )
}

export default CipherReveal
