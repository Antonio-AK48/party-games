import { useState } from 'react'
import Avatar from './Avatar'
import AvatarPicker from './AvatarPicker'
import avatars from '../lib/avatars'

function Lobby({
  code,
  myUid,
  players,
  isHost,
  onLeave,
  onStart,
  onPickAvatar,
}) {
  const [copied, setCopied] = useState(false)
  const [linkCopied, setLinkCopied] = useState(false)
  const [preview, setPreview] = useState(null) // local pick, before confirming
  const [claiming, setClaiming] = useState(false)
  const [pickError, setPickError] = useState('')

  const minPlayers = 3
  const canStart = players.length >= minPlayers
  const inviteLink = `${window.location.origin}/?room=${code}`
  const me = players.find((p) => p.uid === myUid)

  // Avatars other players have already locked in — disabled in the picker.
  const takenByOthers = players
    .filter((p) => p.uid !== myUid && p.avatar)
    .map((p) => p.avatar)

  // The big hero shows your live preview while picking, otherwise your confirmed
  // avatar. "dirty" = you've previewed something you haven't committed yet.
  const shown = preview ?? me?.avatar ?? null
  const dirty = preview != null && preview !== me?.avatar
  const hasAvatars = avatars.length > 0

  const heroNote = dirty
    ? 'Tap “Confirm” to lock it in'
    : me?.avatar
      ? "That's you"
      : hasAvatars
        ? 'Pick your avatar below'
        : "That's you"

  const handleConfirm = async () => {
    if (!dirty || claiming) return
    setClaiming(true)
    setPickError('')
    try {
      await onPickAvatar(preview)
      // Leave preview as-is; once RTDB echoes it into me.avatar, dirty flips false.
    } catch (e) {
      setPickError(e.message || 'Could not pick that avatar')
      setPreview(me?.avatar ?? null) // revert the big preview to your real avatar
    } finally {
      setClaiming(false)
    }
  }

  const copyText = async (text, setFlag) => {
    try {
      await navigator.clipboard.writeText(text)
      setFlag(true)
      setTimeout(() => setFlag(false), 1500)
    } catch {
      // clipboard may be unavailable (insecure context, browser permission); silently no-op
    }
  }

  const handleCopy = () => copyText(code, setCopied)
  const handleCopyLink = () => copyText(inviteLink, setLinkCopied)

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 py-12">
      <div className="w-full max-w-2xl">
        <button
          onClick={onLeave}
          className="text-slate-500 hover:text-slate-300 text-sm mb-6 transition"
        >
          ← Leave room
        </button>

        {/* Big "this is you" preview — updates live as you pick below */}
        <div className="flex flex-col items-center mb-8">
          <Avatar
            name={me?.name}
            avatar={shown}
            className="w-36 h-36 text-6xl ring-4 ring-purple-500/50 shadow-lg shadow-purple-900/40"
          />
          <p className="mt-4 text-2xl font-bold">{me?.name}</p>
          <p className="text-slate-500 text-xs uppercase tracking-wider mt-1">
            {heroNote}
          </p>
        </div>

        {/* Avatar selection — lives in the room so taken ones can be locked */}
        {hasAvatars && (
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6 mb-4">
            <h3 className="text-sm uppercase tracking-wider text-slate-400 mb-4">
              Choose your avatar
            </h3>
            <AvatarPicker
              value={shown}
              onChange={setPreview}
              takenIds={takenByOthers}
            />
            <button
              onClick={handleConfirm}
              disabled={!dirty || claiming}
              className="mt-5 w-full rounded-lg bg-purple-600 hover:bg-purple-500 disabled:bg-slate-800 disabled:text-slate-500 disabled:cursor-not-allowed py-3 font-semibold transition"
            >
              {claiming
                ? 'Locking…'
                : me?.avatar && !dirty
                  ? '✓ Avatar locked in'
                  : 'Confirm avatar'}
            </button>
            {pickError && (
              <p className="mt-3 text-sm text-red-400 text-center">{pickError}</p>
            )}
          </div>
        )}

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
            {copied ? 'Code copied!' : 'Tap the code to copy it.'}
          </p>
          <button
            onClick={handleCopyLink}
            className="mt-4 rounded-lg border border-slate-700 hover:border-purple-500 hover:text-purple-300 px-5 py-2 text-sm font-medium transition"
          >
            {linkCopied ? 'Invite link copied!' : 'Copy invite link'}
          </button>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6 mb-4">
          <h3 className="text-sm uppercase tracking-wider text-slate-400 mb-4">
            Players ({players.length})
          </h3>
          <ul className="space-y-3">
            {players.map((p) => (
              <li key={p.uid} className="flex items-center gap-3">
                <Avatar
                  name={p.name}
                  avatar={p.avatar}
                  className="w-12 h-12 text-lg"
                />
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
              : `Waiting for players… (${minPlayers}+ needed)`}
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
