import { useEffect, useState } from 'react'
import { subscribeRoom } from '../lib/rooms'

// Live view of a room. Returns null when there's no code or the room is empty,
// otherwise the full room object ({ meta, players, ... }) kept in sync via RTDB.
// The snapshot is stored alongside the code it came from, so while a new
// subscription is still warming up we return null rather than the old room.
export default function useRoom(code) {
  const [snap, setSnap] = useState({ code: null, room: null })

  useEffect(() => {
    if (!code) return
    const unsub = subscribeRoom(code, (room) => setSnap({ code, room }))
    return unsub
  }, [code])

  return snap.code === code ? snap.room : null
}
