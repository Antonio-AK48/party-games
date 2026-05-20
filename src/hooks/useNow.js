import { useEffect, useState } from 'react'

// Ticking clock for rendering countdowns. Drives display only — the host's
// authoritative deadline lives in RTDB (meta.phaseEndsAt).
export default function useNow(interval = 500) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), interval)
    return () => clearInterval(id)
  }, [interval])
  return now
}
