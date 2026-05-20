// Shown when Firebase env vars are missing, so the app fails loud and helpful
// instead of throwing deep in a network call.
function SetupNotice() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 py-12">
      <div className="w-full max-w-lg rounded-2xl border border-slate-800 bg-slate-900 p-8">
        <h1 className="text-2xl font-bold mb-2">Almost there</h1>
        <p className="text-slate-400 mb-6">
          The backend isn't configured yet. Add your Firebase keys to{' '}
          <code className="text-purple-400">.env.local</code>, then restart{' '}
          <code className="text-purple-400">npm run dev</code>.
        </p>
        <ol className="list-decimal list-inside space-y-2 text-sm text-slate-300">
          <li>Create a project at console.firebase.google.com</li>
          <li>Enable Realtime Database and Anonymous Authentication</li>
          <li>Register a web app and copy its config values</li>
          <li>
            Paste them into <code className="text-purple-400">.env.local</code>
          </li>
        </ol>
      </div>
    </div>
  )
}

export default SetupNotice
