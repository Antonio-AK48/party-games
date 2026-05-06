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
          onClick={onCreate}
          className="rounded-2xl border border-slate-800 bg-slate-900 hover:bg-slate-800 hover:border-slate-700 transition p-8 text-left group"
        >
          <div className="text-2xl font-semibold mb-2 group-hover:text-purple-400 transition">
            Create Room
          </div>
          <div className="text-slate-400">
            Start a new game and invite friends with a room code
          </div>
        </button>

        <button
          onClick={onJoin}
          className="rounded-2xl border border-slate-800 bg-slate-900 hover:bg-slate-800 hover:border-slate-700 transition p-8 text-left group"
        >
          <div className="text-2xl font-semibold mb-2 group-hover:text-purple-400 transition">
            Join Room
          </div>
          <div className="text-slate-400">
            Got a room code from a friend? Jump in.
          </div>
        </button>
      </div>
    </div>
  )
}

export default Home
