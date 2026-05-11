import { useEffect, useRef, useState } from 'react'

function Timer({ seconds, onExpire }) {
  const [remaining, setRemaining] = useState(seconds)
  const firedRef = useRef(false)

  useEffect(() => {
    const id = setInterval(() => {
      setRemaining((prev) => (prev > 0 ? prev - 1 : 0))
    }, 1000)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    if (remaining === 0 && !firedRef.current) {
      firedRef.current = true
      onExpire?.()
    }
  }, [remaining, onExpire])

  const pct = Math.max(0, (remaining / seconds) * 100)
  const urgent = remaining <= 10

  return (
    <div className="w-full max-w-2xl mx-auto mb-8">
      <div className="flex items-center justify-between text-sm mb-2">
        <span className="text-slate-500 uppercase tracking-wider">Time left</span>
        <span
          className={`tabular-nums ${
            urgent ? 'text-red-400 font-semibold' : 'text-slate-400'
          }`}
        >
          {remaining}s
        </span>
      </div>
      <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
        <div
          className={`h-full transition-all duration-1000 ease-linear ${
            urgent ? 'bg-red-500' : 'bg-purple-500'
          }`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}

export default Timer
