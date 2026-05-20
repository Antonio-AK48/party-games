import { useState } from 'react'

function Lobby({ code, myUid, players, isHost, onLeave, onStart }) {
  const [copied, setCopied] = useState(false)

  const minPlayers = 3
  const canStart = players.length >= minPlayers

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      // clipboard may be unavailable (insecure context, browser permission); silently no-op
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 py-12">
      <div className="w-full max-w-2xl">
        <button
          onClick={onLeave}
          className="text-slate-500 hover:text-slate-300 text-sm mb-6 transition"
        >
          ← Leave room
        </button>

        <div className="text-center mb-10">
          <p className="text-slate-400 text-sm uppercase tracking-wider mb-3">
            Room code
          </p>
          <button
            onClick={handleCopy}
            className="text-6xl sm:text-7xl font-bold tracking-[0.3em] font-mono hover:text-purple-400 transition"
            title="Click to copy"
          >
            {code}
          </button>
          <p className="text-slate-500 text-sm mt-3">
            {copied ? 'Copied!' : 'Click code to copy. Share with friends.'}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6 mb-4">
          <h3 className="text-sm uppercase tracking-wider text-slate-400 mb-4">
            Players ({players.length})
          </h3>
          <ul className="space-y-3">
            {players.map((p) => (
              <li key={p.uid} className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-purple-600 flex items-center justify-center font-semibold">
                  {p.name[0]?.toUpperCase()}
                </div>
                <span className="font-medium">{p.name}</span>
                {p.uid === myUid && (
                  <span className="ml-auto text-xs uppercase tracking-wider text-slate-500">
                    you
                  </span>
                )}
              </li>
            ))}
          </ul>
        </div>

        {isHost ? (
          <button
            onClick={onStart}
            disabled={!canStart}
            className="w-full rounded-lg bg-purple-600 hover:bg-purple-500 disabled:bg-slate-800 disabled:text-slate-500 disabled:cursor-not-allowed py-3 font-semibold transition"
          >
            {canStart
              ? 'Start Game'
              : `Waiting for players (need ${minPlayers - players.length} more)`}
          </button>
        ) : (
          <div className="w-full rounded-lg bg-slate-800 text-slate-400 py-3 font-semibold text-center">
            Waiting for the host to start…
          </div>
        )}
      </div>
    </div>
  )
}

export default Lobby
