import { useEffect, useRef } from 'react'
import { sounds } from '../lib/sound'

// Pure display of remaining time. No internal interval and no expiry callback —
// the parent feeds it secondsLeft from the shared clock, and the host owns when
// a phase actually ends.
function TimerBar({ secondsLeft, total }) {
  // Track previous tick value so we can fire a tick sound exactly once each
  // time secondsLeft drops within the 5-second urgency window.
  const prev = useRef(secondsLeft)
  useEffect(() => {
    // Tick only in the very last beats — 5+ seconds of ticking gets old fast.
    if (
      secondsLeft != null &&
      secondsLeft > 0 &&
      secondsLeft <= 3 &&
      secondsLeft < prev.current
    ) {
      sounds.tick()
    }
    prev.current = secondsLeft
  }, [secondsLeft])

  if (secondsLeft == null) return null
  const pct = total ? Math.max(0, (secondsLeft / total) * 100) : 0
  const urgent = secondsLeft <= 10
  const critical = secondsLeft <= 5

  return (
    <div className="w-full max-w-2xl mx-auto mb-8">
      <div className="flex items-center justify-between text-sm mb-2">
        <span className="text-slate-500 uppercase tracking-wider">Time left</span>
        <span
          className={`tabular-nums ${
            critical
              ? 'text-red-400 font-bold animate-pulse'
              : urgent
              ? 'text-red-400 font-semibold'
              : 'text-slate-400'
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
