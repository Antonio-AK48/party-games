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
    <div className="min-h-screen flex flex-col items-center justify-center px-6 py-12">
      <div className="w-full max-w-2xl">
        <p className="text-slate-400 text-sm uppercase tracking-wider text-center mb-2">
          Prompt {step} of {totalSteps} · author's cut
        </p>
        <p className="text-purple-300 text-sm font-semibold text-center mb-4">
          {judgeName}'s prompt
        </p>
        <h2 className="text-2xl sm:text-3xl font-bold text-center mb-10 leading-tight">
          {prompt}
        </h2>

        <div className="space-y-4">
          {answers.map((a, i) => (
            <div
              key={i}
              className={`rounded-2xl border p-6 transition ${
                a.isChosen
                  ? 'border-purple-500 bg-purple-950/40'
                  : 'border-slate-800 bg-slate-900 opacity-70'
              }`}
            >
              <p className="text-lg font-medium mb-2 break-words">{a.text}</p>
              <p className="text-sm text-slate-400">
                by {a.author}
                {a.isChosen && (
                  <span className="ml-2 inline-flex items-center gap-1.5 rounded-full border border-purple-400/50 bg-purple-400/10 px-2.5 py-0.5 text-xs font-bold uppercase tracking-wide text-purple-200">
                    ★ Chosen +{chosenPoints}
                  </span>
                )}
              </p>
            </div>
          ))}
        </div>

        <p className="text-center text-slate-500 text-sm mt-8">
          {winner
            ? isLast
              ? 'Tallying the scoreboard…'
              : 'Next prompt coming up…'
            : 'No pick made — points unclaimed.'}
        </p>
      </div>
    </div>
  )
}

export default Round3Reveal
