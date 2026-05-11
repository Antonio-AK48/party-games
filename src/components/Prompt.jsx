import { useState } from 'react'

function Prompt({ prompt, step, totalSteps, onSubmit, onNext }) {
  const [answer, setAnswer] = useState('')
  const [submitted, setSubmitted] = useState(false)

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!answer.trim()) return
    setSubmitted(true)
    onSubmit?.(answer.trim())
  }

  const isLast = step >= totalSteps

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 py-12">
      <div className="w-full max-w-2xl">
        <p className="text-slate-400 text-sm uppercase tracking-wider text-center mb-4">
          Prompt {step} of {totalSteps}
        </p>
        <h2 className="text-3xl sm:text-4xl font-bold text-center mb-10 leading-tight">
          {prompt}
        </h2>

        {!submitted ? (
          <form onSubmit={handleSubmit} className="space-y-5">
            <textarea
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              maxLength={100}
              autoFocus
              rows={3}
              placeholder="Type your funniest answer…"
              className="w-full rounded-lg bg-slate-900 border border-slate-800 px-4 py-3 focus:outline-none focus:border-purple-500 transition resize-none"
            />
            <div className="flex items-center justify-between text-sm text-slate-500">
              <span>{answer.length}/100</span>
              <span>Press submit when ready</span>
            </div>
            <button
              type="submit"
              disabled={!answer.trim()}
              className="w-full rounded-lg bg-purple-600 hover:bg-purple-500 disabled:bg-slate-800 disabled:text-slate-500 disabled:cursor-not-allowed py-3 font-semibold transition"
            >
              Submit Answer
            </button>
          </form>
        ) : (
          <div className="text-center space-y-6">
            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6 text-left">
              <p className="text-slate-400 text-sm uppercase tracking-wider mb-3">
                Your answer
              </p>
              <p className="text-xl font-medium">{answer}</p>
            </div>
            <button
              onClick={onNext}
              className="w-full rounded-lg bg-purple-600 hover:bg-purple-500 py-3 font-semibold transition"
            >
              {isLast ? 'Done →' : 'Next prompt →'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export default Prompt
