import { useEffect, useState } from 'react'
import Home from './components/Home'
import CreateForm from './components/CreateForm'
import JoinForm from './components/JoinForm'
import Lobby from './components/Lobby'
import Game from './components/Game'
import SetupNotice from './components/SetupNotice'
import useRoom from './hooks/useRoom'
import { isConfigured, ensureAuth } from './lib/firebase'
import {
  createRoom,
  joinRoom,
  leaveRoom,
  startGame,
  playerExists,
} from './lib/rooms'
import { saveSession, loadSession, clearSession } from './lib/session'

function Shell({ children }) {
  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">{children}</main>
  )
}

function App() {
  const [view, setView] = useState('home') // 'home' | 'create' | 'join'
  const [session, setSession] = useState(null) // { code, uid }
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  // Only "restoring" when there's a backend to restore against.
  const [restoring, setRestoring] = useState(isConfigured)
  const [inviteCode, setInviteCode] = useState('')

  // On load: rejoin a remembered room (survives refresh/disconnect), otherwise
  // honor a ?room=CODE invite link by jumping to the prefilled join screen.
  useEffect(() => {
    if (!isConfigured) return
    let cancelled = false
    ;(async () => {
      const saved = loadSession()
      if (saved?.code) {
        try {
          const uid = await ensureAuth()
          if (!cancelled && (await playerExists(saved.code, uid))) {
            setSession({ code: saved.code, uid })
            setRestoring(false)
            return
          }
        } catch {
          // fall through to invite/home
        }
        clearSession()
      }
      if (cancelled) return
      const roomParam = new URLSearchParams(window.location.search).get('room')
      if (roomParam && /^[A-Za-z]{4}$/.test(roomParam)) {
        setInviteCode(roomParam.toUpperCase())
        setView('join')
      }
      setRestoring(false)
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const room = useRoom(session?.code)

  // Until Firebase keys are filled in, nothing else can work — guide the user.
  if (!isConfigured) {
    return (
      <Shell>
        <SetupNotice />
      </Shell>
    )
  }

  if (restoring) {
    return (
      <Shell>
        <div className="min-h-screen flex items-center justify-center text-slate-500">
          Loading…
        </div>
      </Shell>
    )
  }

  const backHome = () => {
    setView('home')
    setError('')
  }

  const handleCreate = async (name, avatar) => {
    setBusy(true)
    setError('')
    try {
      const s = await createRoom(name, avatar)
      saveSession(s.code)
      setSession(s)
    } catch (e) {
      setError(e.message || 'Could not create the room')
    } finally {
      setBusy(false)
    }
  }

  const handleJoin = async (name, code, avatar) => {
    setBusy(true)
    setError('')
    try {
      const s = await joinRoom(name, code, avatar)
      saveSession(s.code)
      setSession(s)
    } catch (e) {
      setError(e.message || 'Could not join the room')
    } finally {
      setBusy(false)
    }
  }

  const handleLeave = async () => {
    if (session) {
      try {
        await leaveRoom(session.code, session.uid)
      } catch {
        // best-effort cleanup; leaving the view matters more than the write
      }
    }
    clearSession()
    setSession(null)
    backHome()
  }

  // ---- In a room: render lobby or game from live room state ----------------
  if (session) {
    const status = room?.meta?.status
    const players = room?.players
      ? Object.entries(room.players)
          .map(([uid, p]) => ({
            uid,
            name: p.name,
            avatar: p.avatar || null,
            score: p.score || 0,
            joinedAt: p.joinedAt || 0,
          }))
          .sort((a, b) => a.joinedAt - b.joinedAt)
      : []
    const isHost = room?.meta?.hostId === session.uid

    if (!status || status === 'lobby') {
      return (
        <Shell>
          <Lobby
            code={session.code}
            myUid={session.uid}
            players={players}
            isHost={isHost}
            onLeave={handleLeave}
            onStart={() => startGame(session.code)}
          />
        </Shell>
      )
    }

    return (
      <Shell>
        <Game
          room={room}
          code={session.code}
          uid={session.uid}
          isHost={isHost}
          onLeave={handleLeave}
        />
      </Shell>
    )
  }

  // ---- Not in a room: home / create / join --------------------------------
  return (
    <Shell>
      {view === 'home' && (
        <Home
          onCreate={() => setView('create')}
          onJoin={() => setView('join')}
        />
      )}
      {view === 'create' && (
        <CreateForm
          onSubmit={handleCreate}
          onBack={backHome}
          busy={busy}
          error={error}
        />
      )}
      {view === 'join' && (
        <JoinForm
          onSubmit={handleJoin}
          onBack={backHome}
          busy={busy}
          error={error}
          initialCode={inviteCode}
        />
      )}
    </Shell>
  )
}

export default App
