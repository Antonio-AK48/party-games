import { useState } from 'react'
import Avatar from './Avatar'
import AvatarPicker from './AvatarPicker'
import avatars from '../lib/avatars'
import { Screen, Panel, Btn, Label, BackLink } from './ui'

const GAME_LABEL = { captions: 'Captions', cipher: 'Decode' }
// Captions stays at 3 for solo-laptop testing; Decode genuinely needs 4 (2v2).
const MIN_PLAYERS_BY_GAME = { captions: 3, cipher: 4 }

function Lobby({
  code,
  myUid,
  players,
  isHost,
  gameType = 'captions',
  onLeave,
  onStart,
  onPickAvatar,
}) {
  const [copied, setCopied] = useState(false)
  const [linkCopied, setLinkCopied] = useState(false)
  const [preview, setPreview] = useState(null) // local pick, before confirming
  const [claiming, setClaiming] = useState(false)
  const [pickError, setPickError] = useState('')

  const gameLabel = GAME_LABEL[gameType] || 'Game'
  const minPlayers = MIN_PLAYERS_BY_GAME[gameType] ?? 3
  const canStart = players.length >= minPlayers
  const isCipher = gameType === 'cipher'
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
    ? 'confirm to lock it in'
    : me?.avatar
      ? 'that’s you'
      : hasAvatars
        ? 'pick your avatar below'
        : 'that’s you'

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
    // data-game retints the entire lobby to whichever game is being set up.
    <div data-game={gameType}>
      <Screen center={false}>
        <BackLink onClick={onLeave}>← leave room</BackLink>

        {/* The room code is the single most important thing on this screen —
            it's what people are squinting at from across the room. */}
        <Panel ticks glow bodyClassName="p-7 text-center" className="mb-4">
          <Label accent className="mb-4">
            {gameLabel} · room code
          </Label>
          <button
            onClick={handleCopy}
            className="hud neon block w-full text-6xl leading-none tracking-[0.25em] transition hover:brightness-125 sm:text-8xl"
            title="Click to copy"
          >
            {code}
          </button>
          <p className="hud mt-5 text-[0.62rem] text-faint">
            {copied ? '✓ code copied' : 'tap the code to copy'}
          </p>
          <div className="mt-5 flex justify-center">
            <Btn
              variant="ghost"
              sm
              onClick={handleCopyLink}
              className="w-auto min-w-48"
            >
              {linkCopied ? '✓ link copied' : 'copy invite link'}
            </Btn>
          </div>
        </Panel>

        {/* "This is you" — updates live as you pick below. */}
        <div className="mb-4 flex flex-col items-center py-4">
          <Avatar
            name={me?.name}
            avatar={shown}
            className="w-32 h-32 text-5xl shadow-[var(--accent-glow)]"
            cut="20%"
          />
          <p className="display mt-4 text-2xl">{me?.name}</p>
          <Label className="mt-1">{heroNote}</Label>
        </div>

        {hasAvatars && (
          <Panel className="mb-4">
            <Label className="mb-4">choose your avatar</Label>
            <AvatarPicker
              value={shown}
              onChange={setPreview}
              takenIds={takenByOthers}
            />
            <Btn
              onClick={handleConfirm}
              disabled={!dirty || claiming}
              className="mt-5"
            >
              {claiming
                ? 'locking…'
                : me?.avatar && !dirty
                  ? '✓ avatar locked in'
                  : 'confirm avatar'}
            </Btn>
            {pickError && (
              <p className="mt-3 text-center text-sm text-rose">{pickError}</p>
            )}
          </Panel>
        )}

        <Panel className="mb-4">
          <div className="mb-4 flex items-baseline justify-between">
            <Label>players</Label>
            <span className="hud accent-text text-sm tabular-nums">
              {String(players.length).padStart(2, '0')}
              <span className="text-faint">/{String(minPlayers).padStart(2, '0')}</span>
            </span>
          </div>
          <ul className="space-y-2.5">
            {players.map((p, i) => (
              <li key={p.uid} className="flex items-center gap-3">
                <span className="hud w-6 shrink-0 text-[0.62rem] text-faint">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <Avatar
                  name={p.name}
                  avatar={p.avatar}
                  className="w-10 h-10 text-base"
                />
                <span className="truncate font-semibold">{p.name}</span>
                {p.uid === myUid && (
                  <span className="hud ml-auto text-[0.6rem] accent-text">you</span>
                )}
              </li>
            ))}
          </ul>
          {isCipher && (
            <p className="mt-4 text-xs text-faint">
              Teams will be split evenly when the host starts.
            </p>
          )}
        </Panel>

        {isHost ? (
          <Btn onClick={onStart} disabled={!canStart}>
            {canStart ? '▶ start game' : `waiting for players · ${minPlayers}+ needed`}
          </Btn>
        ) : (
          <Panel sm bodyClassName="py-3.5 text-center">
            <span className="hud text-sm text-faint">
              waiting for the host to start…
            </span>
          </Panel>
        )}
      </Screen>
    </div>
  )
}

export default Lobby
