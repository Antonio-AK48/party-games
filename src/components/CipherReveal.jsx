import { CODE_LENGTH, toArr } from '../lib/cipher'

// Phase: cipher-reveal. Show what actually happened this round — the real
// codes, both teams' guesses side-by-side with each, and any tokens earned.

function CodePill({ digits, theme, highlight }) {
  const arr = toArr(digits)
  return (
    <div className="inline-flex gap-2">
      {arr.map((d, i) => (
        <span
          key={i}
          className={`w-10 h-10 rounded-md border flex items-center justify-center text-xl font-bold tabular-nums ${
            highlight
              ? `${theme.pillBorder} ${theme.pillBg} ${theme.accent}`
              : 'border-slate-800 bg-slate-900 text-slate-300'
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
      <span className="text-sm text-slate-400">{label}</span>
      <div className="flex items-center gap-2">
        <CodePill digits={guess} theme={theme} highlight={correct} />
        <span className={correct ? 'text-emerald-400' : 'text-rose-400'}>
          {correct ? '✓' : '✗'}
        </span>
      </div>
    </div>
  )
}

function TeamPanel({ label, theme, clues, code, guessesByOther, resultForThisTeam }) {
  return (
    <div className={`rounded-2xl border p-5 ${theme.border} ${theme.bg}`}>
      <div className="flex items-center justify-between mb-3">
        <p
          className={`text-xs uppercase tracking-[0.3em] font-semibold ${theme.accent}`}
        >
          {label}
        </p>
        <div className="flex items-center gap-2">
          <p className="text-xs uppercase tracking-wider text-slate-500">code</p>
          <CodePill digits={code} theme={theme} highlight />
        </div>
      </div>

      <ol className="space-y-1.5 mb-4">
        {Array.from({ length: CODE_LENGTH }).map((_, i) => (
          <li key={i} className="flex items-baseline gap-3">
            <span className={`text-lg font-bold tabular-nums ${theme.accent}`}>
              #{i + 1} → {toArr(code)[i]}
            </span>
            <span className="text-base text-slate-200 break-words">
              {toArr(clues)[i]}
            </span>
          </li>
        ))}
      </ol>

      <div className="border-t border-slate-700/30 pt-3 space-y-1">
        <GuessRow
          label={`${label} own guess`}
          guess={guessesByOther.ownByOwner}
          code={code}
          theme={theme}
        />
        <GuessRow
          label="Intercept attempt"
          guess={guessesByOther.oppByOther}
          code={code}
          theme={theme}
        />
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {resultForThisTeam.gotIntercept && (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/40 bg-emerald-400/10 px-3 py-1 text-xs font-bold uppercase tracking-wide text-emerald-300">
            🎯 Intercepted
          </span>
        )}
        {resultForThisTeam.gotMiscom && (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-rose-400/40 bg-rose-400/10 px-3 py-1 text-xs font-bold uppercase tracking-wide text-rose-300">
            💥 Miscommunication
          </span>
        )}
        {!resultForThisTeam.gotIntercept && !resultForThisTeam.gotMiscom && (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-700 bg-slate-800/40 px-3 py-1 text-xs font-bold uppercase tracking-wide text-slate-400">
            Clean round
          </span>
        )}
      </div>
    </div>
  )
}

function CipherReveal({ currentRound, themeA, themeB }) {
  const result = currentRound?.result || { A: {}, B: {} }
  return (
    <div className="space-y-4">
      <p className="text-center text-slate-400 text-sm uppercase tracking-wider">
        Round reveal
      </p>
      <div className="grid sm:grid-cols-2 gap-3">
        <TeamPanel
          label="Team A"
          theme={themeA}
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
      <p className="text-center text-slate-500 text-sm">
        Next round coming up…
      </p>
    </div>
  )
}

export default CipherReveal
