import { useState } from 'react'

function CreateForm({ onSubmit, onBack, busy, error }) {
  const [name, setName] = useState('')

  const handleSubmit = (e) => {
    e.preventDefault()
    if (name.trim() && !busy) onSubmit(name.trim())
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 py-12">
      <div className="w-full max-w-md">
        <button
          onClick={onBack}
          className="text-slate-500 hover:text-slate-300 text-sm mb-6 transition"
        >
          ← Back
        </button>

        <h2 className="text-3xl font-bold mb-2">Create a Room</h2>
        <p className="text-slate-400 mb-8">
          Pick a name. We'll generate a room code you can share.
        </p>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label
              htmlFor="name"
              className="block text-sm text-slate-400 mb-2"
            >
              Your name
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={20}
              autoFocus
              placeholder="e.g. Antonio"
              className="w-full rounded-lg bg-slate-900 border border-slate-800 px-4 py-3 focus:outline-none focus:border-purple-500 transition"
            />
          </div>

          <button
            type="submit"
            disabled={!name.trim() || busy}
            className="w-full rounded-lg bg-purple-600 hover:bg-purple-500 disabled:bg-slate-800 disabled:text-slate-500 disabled:cursor-not-allowed py-3 font-semibold transition"
          >
            {busy ? 'Creating…' : 'Create Room'}
          </button>

          {error && (
            <p className="text-sm text-red-400 text-center">{error}</p>
          )}
        </form>
      </div>
    </div>
  )
}

export default CreateForm
