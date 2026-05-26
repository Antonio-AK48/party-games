import { useEffect, useState } from 'react'

// Animates from 0 up to `target` over `ms` milliseconds with an ease-out curve.
// Returns the integer the UI should currently render. Re-runs on every target
// change, which is fine for one-shot reveals (mount, between rounds) — and a
// non-issue at the small numbers we render (votes, scores) since easing tends
// to settle within a frame or two of a steady target.
export default function useCountUp(target, ms = 1200) {
  const [value, setValue] = useState(0)
  useEffect(() => {
    if (typeof target !== 'number' || target <= 0) return
    const start = performance.now()
    let raf
    const tick = (now) => {
      const t = Math.min(1, (now - start) / ms)
      const eased = 1 - Math.pow(1 - t, 3) // ease-out cubic
      setValue(Math.round(target * eased))
      if (t < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [target, ms])
  // Non-positive targets render 0 immediately rather than the stale animated
  // value — keeps invalid/empty cases honest without a setState in the effect.
  return typeof target === 'number' && target > 0 ? value : 0
}
