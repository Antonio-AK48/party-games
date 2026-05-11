function Scoreboard({ players, isFinal, onNext, onLeave }) {
  const sorted = [...players].sort((a, b) => b.score - a.score)
  const top = sorted[0]?.score || 1

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 py-12">
      <div className="w-full max-w-2xl">
        <p className="text-slate-400 text-sm uppercase tracking-wider text-center mb-3">
          {isFinal ? 'Final Scores' : 'Standings'}
        </p>
        <h2 className="text-4xl sm:text-5xl font-bold text-center mb-10">
          {isFinal ? `${sorted[0]?.name} wins!` : 'Scoreboard'}
        </h2>

        <ol className="space-y-3">
          {sorted.map((p, i) => {
            const pct = Math.max(8, Math.round((p.score / top) * 100))
            return (
              <li
                key={p.name}
                className="relative overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 p-5"
              >
                <div
                  className="absolute inset-y-0 left-0 bg-purple-600/15"
                  style={{ width: `${pct}%` }}
                />
                <div className="relative flex items-center gap-4">
                  <span className="text-2xl font-bold text-slate-500 w-8">
                    {i + 1}
                  </span>
                  <div className="w-10 h-10 rounded-full bg-purple-600 flex items-center justify-center font-semibold">
                    {p.name[0]?.toUpperCase()}
                  </div>
                  <span className="text-lg font-medium flex-1">{p.name}</span>
                  <span className="text-2xl font-bold tabular-nums">
                    {p.score}
                  </span>
                </div>
              </li>
            )
          })}
        </ol>

        <div className="flex flex-col sm:flex-row gap-3 mt-10">
          {!isFinal && (
            <button
              onClick={onNext}
              className="flex-1 rounded-lg bg-purple-600 hover:bg-purple-500 py-3 font-semibold transition"
            >
              Next Round →
            </button>
          )}
          <button
            onClick={onLeave}
            className={`rounded-lg border border-slate-800 hover:bg-slate-900 py-3 px-6 font-semibold transition ${
              isFinal ? 'flex-1' : ''
            }`}
          >
            {isFinal ? 'Back to Home' : 'Leave Game'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default Scoreboard
