import { useState } from 'react'
import { Screen, Panel, Btn, Field, Label, BackLink } from './ui'

const GAME_LABELS = {
  captions: 'Captions',
  cipher: 'Decode',
}

function CreateForm({ onSubmit, onBack, busy, error, gameType = 'captions' }) {
  const [name, setName] = useState('')
  const label = GAME_LABELS[gameType] || 'Game'

  const handleSubmit = (e) => {
    e.preventDefault()
    if (name.trim() && !busy) onSubmit(name.trim())
  }

  return (
    // data-game retints the whole screen to the game being created.
    <div data-game={gameType}>
      <Screen width="max-w-md">
        <BackLink onClick={onBack}>← back</BackLink>

        <Label accent className="mb-3">
          new room · {label}
        </Label>
        <h2 className="display text-4xl mb-3">Create a room</h2>
        <p className="text-muted mb-8">
          Pick a name. We&apos;ll generate a room code you can share.
        </p>

        <form onSubmit={handleSubmit} className="space-y-5">
          <Field
            id="name"
            label="Your name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={20}
            autoFocus
            placeholder="e.g. Antonio"
          />

          <Btn type="submit" disabled={!name.trim() || busy}>
            {busy ? 'creating…' : 'create room'}
          </Btn>

          {error && (
            <Panel sm tone="bg-rose/50" bodyClassName="p-3 text-center">
              <p className="text-sm text-rose">{error}</p>
            </Panel>
          )}
        </form>
      </Screen>
    </div>
  )
}

export default CreateForm
