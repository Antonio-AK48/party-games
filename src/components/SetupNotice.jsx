import { Screen, Panel, Label } from './ui'

// Shown when Firebase env vars are missing, so the app fails loud and helpful
// instead of throwing deep in a network call.
function SetupNotice() {
  return (
    <Screen width="max-w-lg">
      <Panel ticks bodyClassName="p-7">
        <Label accent className="mb-3">
          system · not configured
        </Label>
        <h1 className="display text-3xl mb-3">Almost there</h1>
        <p className="text-muted mb-6">
          The backend isn&apos;t configured yet. Add your Firebase keys to{' '}
          <code className="hud accent-text text-[0.8em]">.env.local</code>, then
          restart <code className="hud accent-text text-[0.8em]">npm run dev</code>.
        </p>
        <ol className="space-y-2.5 text-sm text-muted">
          {[
            'Create a project at console.firebase.google.com',
            'Enable Realtime Database and Anonymous Authentication',
            'Register a web app and copy its config values',
            'Paste them into .env.local',
          ].map((stepText, i) => (
            <li key={i} className="flex gap-3">
              <span className="hud accent-text shrink-0 text-[0.7rem] pt-0.5">
                {String(i + 1).padStart(2, '0')}
              </span>
              <span>{stepText}</span>
            </li>
          ))}
        </ol>
      </Panel>
    </Screen>
  )
}

export default SetupNotice
