function App() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-100 px-6">
      <div className="text-center max-w-xl">
        <h1 className="text-5xl sm:text-6xl font-bold tracking-tight mb-4">
          Party Games
        </h1>
        <p className="text-lg text-slate-400 mb-8">
          Lebanese-flavored party games for phones, laptops, and TVs. Coming soon.
        </p>
        <div className="inline-flex gap-3 text-sm text-slate-500">
          <span className="px-3 py-1 rounded-full bg-slate-900 border border-slate-800">
            React + Vite
          </span>
          <span className="px-3 py-1 rounded-full bg-slate-900 border border-slate-800">
            Tailwind v4
          </span>
        </div>
      </div>
    </main>
  )
}

export default App
