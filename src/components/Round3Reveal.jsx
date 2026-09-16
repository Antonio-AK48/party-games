import { Screen, Pill, PhaseHeader } from './ui'

// Round 3 / Author's Cut: per-prompt reveal. Shows the prompt, the judge (the
// prompt's author), all answers with their writers revealed, and highlights
// whichever one the judge picked. Counterpart to Round3Judging.
function Round3Reveal({
  prompt,
  judgeName,
  answers,
  chosenPoints,
  step,
  totalSteps,
}) {
  const winner = answers.find((a) => a.isChosen)
  const isLast = step >= totalSteps

  return (
    <Screen>
      <PhaseHeader
        kicker={`prompt ${step} of ${totalSteps} · author's cut`}
        title={prompt}
        sub={`${judgeName}'s prompt`}
      />

      <div className="space-y-3">
        {answers.map((a, i) => (
          <div
            key={i}
            className={`cut-frame transition ${
              a.isChosen
                ? 'bg-[var(--accent)] shadow-[var(--accent-glow)]'
                : 'bg-line'
            }`}
          >
            <div
              className={`cut-face relative p-5 transition ${
                a.isChosen ? 'ticks bg-[var(--accent)]/12' : 'bg-surface opacity-70'
              }`}
            >
              <p className="mb-2 text-lg font-medium break-words">{a.text}</p>
              <div className="flex flex-wrap items-center gap-2">
                <span className="hud text-[0.62rem] text-faint">
                  by {a.author}
                </span>
                {a.isChosen && (
                  <Pill tone="accent">★ chosen +{chosenPoints}</Pill>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      <p className="hud mt-8 text-center text-[0.62rem] text-faint">
        {winner
          ? isLast
            ? 'tallying the scoreboard…'
            : 'next prompt coming up…'
          : 'no pick made — points unclaimed.'}
      </p>
    </Screen>
  )
}

export default Round3Reveal
