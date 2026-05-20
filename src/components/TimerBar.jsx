// Pure display of remaining time. No internal interval and no expiry callback —
// the parent feeds it secondsLeft from the shared clock, and the host owns when
// a phase actually ends.
function TimerBar({ secondsLeft, total }) {
  if (secondsLeft == null) return null
  const pct = total ? Math.max(0, (secondsLeft / total) * 100) : 0
  const urgent = secondsLeft <= 10

  return (
    <div className="w-full max-w-2xl mx-auto mb-8">
      <div className="flex items-center justify-between text-sm mb-2">
        <span className="text-slate-500 uppercase tracking-wider">Time left</span>
        <span
          className={`tabular-nums ${
            urgent ? 'text-red-400 font-semibold' : 'text-slate-400'
          }`}
        >
          {secondsLeft}s
        </span>
      </div>
      <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
        <div
          className={`h-full transition-all duration-500 ease-linear ${
            urgent ? 'bg-red-500' : 'bg-purple-500'
          }`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}

export default TimerBar
