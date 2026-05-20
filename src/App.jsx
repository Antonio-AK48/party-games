import { useState } from 'react'
import Home from './components/Home'
import CreateForm from './components/CreateForm'
import JoinForm from './components/JoinForm'
import Lobby from './components/Lobby'
import Game from './components/Game'
import SetupNotice from './components/SetupNotice'
import useRoom from './hooks/useRoom'
import { isConfigured } from './lib/firebase'
import { createRoom, joinRoom, leaveRoom, startGame } from './lib/rooms'

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

  const room = useRoom(session?.code)

  // Until Firebase keys are filled in, nothing else can work — guide the user.
  if (!isConfigured) {
    return (
      <Shell>
        <SetupNotice />
      </Shell>
    )
  }

  const backHome = () => {
    setView('home')
    setError('')
  }

  const handleCreate = async (name) => {
    setBusy(true)
    setError('')
    try {
      setSession(await createRoom(name))
    } catch (e) {
      setError(e.message || 'Could not create the room')
    } finally {
      setBusy(false)
    }
  }

  const handleJoin = async (name, code) => {
    setBusy(true)
    setError('')
    try {
      setSession(await joinRoom(name, code))
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
        />
      )}
    </Shell>
  )
}

export default App
