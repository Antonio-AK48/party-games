import { useState } from 'react'
import { Screen, Panel, Btn, Field, Label, BackLink } from './ui'

function JoinForm({ onSubmit, onBack, busy, error, initialCode = '' }) {
  const [name, setName] = useState('')
  const [code, setCode] = useState(initialCode)

  const canSubmit = name.trim() && code.length === 4 && !busy

  const handleSubmit = (e) => {
    e.preventDefault()
    if (canSubmit) onSubmit(name.trim(), code)
  }

  return (
    <Screen width="max-w-md">
      <BackLink onClick={onBack}>← back</BackLink>

      <Label accent className="mb-3">
        connect
      </Label>
      <h2 className="display text-4xl mb-3">Join a room</h2>
      <p className="text-muted mb-8">Got a 4-letter code? Drop it in.</p>

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

        <Field
          id="code"
          label="Room code"
          type="text"
          value={code}
          onChange={(e) =>
            setCode(
              e.target.value.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 4)
            )
          }
          placeholder="ABCD"
          inputClassName="hud text-center text-4xl tracking-[0.4em] py-5 accent-text"
        />

        <Btn type="submit" disabled={!canSubmit}>
          {busy ? 'joining…' : 'join room'}
        </Btn>

        {error && (
          <Panel sm tone="bg-rose/50" bodyClassName="p-3 text-center">
            <p className="text-sm text-rose">{error}</p>
          </Panel>
        )}
      </form>
    </Screen>
  )
}

export default JoinForm
