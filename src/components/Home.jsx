// onCreate receives the chosen gameType so the create flow knows which game
// the host is spinning up.
function Home({ onCreate, onJoin }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 py-12">
      <div className="text-center mb-12">
        <h1 className="text-5xl sm:text-7xl font-bold tracking-tight mb-4">
          Party Games
        </h1>
        <p className="text-lg text-slate-400">
          Lebanese-flavored party games for phones, laptops, and TVs
        </p>
      </div>

      <div className="grid sm:grid-cols-2 gap-4 w-full max-w-2xl">
        <button
          onClick={() => onCreate('captions')}
          className="rounded-2xl border border-slate-800 bg-slate-900 hover:bg-slate-800 hover:border-purple-500 transition p-8 text-left group"
        >
          <div className="text-2xl font-semibold mb-2 group-hover:text-purple-400 transition">
            Captions
          </div>
          <div className="text-slate-400">
            Write the funniest answer to each prompt, vote on the rest. 4+ players.
          </div>
        </button>

        <button
          onClick={() => onCreate('cipher')}
          className="rounded-2xl border border-slate-800 bg-slate-900 hover:bg-slate-800 hover:border-sky-500 transition p-8 text-left group"
        >
          <div className="text-2xl font-semibold mb-2 group-hover:text-sky-400 transition">
            Decode
          </div>
          <div className="text-slate-400">
            Two teams, secret keywords, coded clues. Intercept the other team's
            code before they intercept yours. 4–8 players.
          </div>
        </button>
      </div>

      <button
        onClick={onJoin}
        className="mt-6 w-full max-w-2xl rounded-2xl border border-slate-800 bg-slate-900 hover:bg-slate-800 hover:border-slate-700 transition p-6 text-left group"
      >
        <div className="text-xl font-semibold mb-1 group-hover:text-purple-400 transition">
          Join Room
        </div>
        <div className="text-slate-400 text-sm">
          Got a room code from a friend? Jump in.
        </div>
      </button>
    </div>
  )
}

export default Home
