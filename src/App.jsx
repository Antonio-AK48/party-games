import { useState } from 'react'
import Home from './components/Home'
import CreateForm from './components/CreateForm'
import JoinForm from './components/JoinForm'
import Lobby from './components/Lobby'

function generateRoomCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
  return Array.from(
    { length: 4 },
    () => chars[Math.floor(Math.random() * chars.length)]
  ).join('')
}

function App() {
  const [view, setView] = useState('home')
  const [playerName, setPlayerName] = useState('')
  const [roomCode, setRoomCode] = useState('')

  const goHome = () => {
    setView('home')
    setPlayerName('')
    setRoomCode('')
  }

  const handleCreateRoom = (name) => {
    setPlayerName(name)
    setRoomCode(generateRoomCode())
    setView('lobby')
  }

  const handleJoinRoom = (name, code) => {
    setPlayerName(name)
    setRoomCode(code)
    setView('lobby')
  }

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      {view === 'home' && (
        <Home
          onCreate={() => setView('create')}
          onJoin={() => setView('join')}
        />
      )}
      {view === 'create' && (
        <CreateForm onSubmit={handleCreateRoom} onBack={goHome} />
      )}
      {view === 'join' && (
        <JoinForm onSubmit={handleJoinRoom} onBack={goHome} />
      )}
      {view === 'lobby' && (
        <Lobby code={roomCode} playerName={playerName} onLeave={goHome} />
      )}
    </main>
  )
}

export default App
