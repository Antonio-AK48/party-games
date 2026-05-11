import { useState } from 'react'
import Home from './components/Home'
import CreateForm from './components/CreateForm'
import JoinForm from './components/JoinForm'
import Lobby from './components/Lobby'
import Game from './components/Game'

function generateRoomCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
  return Array.from(
    { length: 4 },
    () => chars[Math.floor(Math.random() * chars.length)]
  ).join('')
}

function seedPlayers(playerName) {
  return [
    { name: playerName, score: 0 },
    { name: 'Tarek', score: 0 },
    { name: 'Layla', score: 0 },
    { name: 'Karim', score: 0 },
  ]
}

function App() {
  const [view, setView] = useState('home')
  const [playerName, setPlayerName] = useState('')
  const [roomCode, setRoomCode] = useState('')
  const [players, setPlayers] = useState([])

  const goHome = () => {
    setView('home')
    setPlayerName('')
    setRoomCode('')
    setPlayers([])
  }

  const handleCreateRoom = (name) => {
    setPlayerName(name)
    setRoomCode(generateRoomCode())
    setPlayers(seedPlayers(name))
    setView('lobby')
  }

  const handleJoinRoom = (name, code) => {
    setPlayerName(name)
    setRoomCode(code)
    setPlayers(seedPlayers(name))
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
        <Lobby
          code={roomCode}
          playerName={playerName}
          players={players}
          onLeave={goHome}
          onStart={() => setView('game')}
        />
      )}
      {view === 'game' && (
        <Game playerName={playerName} players={players} onLeave={goHome} />
      )}
    </main>
  )
}

export default App
