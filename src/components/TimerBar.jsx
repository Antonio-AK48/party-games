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
    <div className="mx-auto mb-8 w-full max-w-2xl">
      <div className="mb-2 flex items-baseline justify-between">
        <span className="hud text-[0.62rem] text-faint">time remaining</span>
        <span
          className={`hud tabular-nums tracking-normal ${
            critical
              ? 'animate-pulse text-rose text-lg'
              : urgent
                ? 'text-rose text-base'
                : 'text-muted text-base'
          }`}
        >
          {String(secondsLeft).padStart(2, '0')}
        </span>
      </div>
      {/* Segmented rather than a smooth bar — a readout, not a progress bar. */}
      <div className="relative h-2 overflow-hidden bg-surface-2">
        <div
          className={`h-full transition-all duration-500 ease-linear ${
            urgent ? 'bg-rose' : 'bg-[var(--accent)]'
          }`}
          style={{
            width: `${pct}%`,
            boxShadow: urgent
              ? '0 0 12px var(--color-rose)'
              : '0 0 12px var(--accent)',
          }}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage:
              'repeating-linear-gradient(90deg, transparent 0 7px, var(--color-ink) 7px 9px)',
          }}
        />
      </div>
    </div>
  )
}

export default TimerBar
