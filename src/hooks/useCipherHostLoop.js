import { useEffect, useRef } from 'react'
import {
  startCipherRound,
  startCipherGuessing,
  applyCipherResult,
  endCipherGame,
} from '../lib/rooms'
import {
  evaluateRound,
  checkWinner,
} from '../lib/cipher'

// Host-authoritative phase pump for Decode. The host's tab is the only writer
// of phase transitions; other clients just observe the room and render the
// current phase. Mirrors useHostLoop (Captions) but with cipher's flow:
//   cipher-active → cipher-clues → cipher-guessing → cipher-reveal → next or end
//
// Conditions:
//   cipher-active   → if no round data yet, write round 1's codes/encryptors.
//   cipher-clues    → both teams submitted clues → open guessing.
//   cipher-guessing → both teams locked their guesses → evaluate, write result.
//   cipher-reveal   → timer expired → start next round or end the game.
//
// pendingRef holds the status we just wrote and are waiting to observe back,
// preventing double-fires while a write is in flight (same pattern as the
// Captions loop).
export default function useCipherHostLoop({ room, code, isHost }) {
  const roomRef = useRef(room)
  const pendingRef = useRef(null)

  useEffect(() => {
    roomRef.current = room
  }, [room])

  useEffect(() => {
    if (!isHost || !code) return
    const id = setInterval(tick, 700)
    return () => clearInterval(id)

    async function tick() {
      const r = roomRef.current
      if (!r?.meta || r.meta.gameType !== 'cipher') return
      const { status, round = 1, phaseEndsAt } = r.meta

      if (pendingRef.current) {
        if (status === pendingRef.current) pendingRef.current = null
        else return
      }

      const cipher = r.cipher
      if (!cipher) return
      const currentRound = cipher.rounds?.[round] || {}
      const expired = phaseEndsAt ? Date.now() >= phaseEndsAt : false

      try {
        if (status === 'cipher-active') {
          // Just-started game: open round 1 (or whatever the stored round is).
          if (!currentRound.codes) {
            pendingRef.current = 'cipher-clues'
            await startCipherRound(code, round, cipher)
          }
        } else if (status === 'cipher-clues') {
          // Both encryptors have written their clues — open guessing.
          if (currentRound.clues?.A && currentRound.clues?.B) {
            pendingRef.current = 'cipher-guessing'
            await startCipherGuessing(code)
          }
        } else if (status === 'cipher-guessing') {
          // Both teams have locked their guesses — score the round.
          const aLocked = currentRound.guesses?.A?.locked
          const bLocked = currentRound.guesses?.B?.locked
          if (aLocked && bLocked) {
            const result = evaluateRound(currentRound)
            const teamA = {
              intercepts:
                (cipher.teamA?.intercepts || 0) + (result.A.gotIntercept ? 1 : 0),
              miscoms:
                (cipher.teamA?.miscoms || 0) + (result.A.gotMiscom ? 1 : 0),
            }
            const teamB = {
              intercepts:
                (cipher.teamB?.intercepts || 0) + (result.B.gotIntercept ? 1 : 0),
              miscoms:
                (cipher.teamB?.miscoms || 0) + (result.B.gotMiscom ? 1 : 0),
            }
            pendingRef.current = 'cipher-reveal'
            await applyCipherResult(code, round, result, teamA, teamB)
          }
        } else if (status === 'cipher-reveal' && expired) {
          // Reveal duration over — check win conditions, then either start the
          // next round or jump to the final scoreboard.
          const winState = checkWinner(cipher.teamA, cipher.teamB, round)
          if (winState.ended) {
            pendingRef.current = 'cipher-scoreboard'
            await endCipherGame(code, winState.winner)
          } else {
            pendingRef.current = 'cipher-clues'
            await startCipherRound(code, round + 1, cipher)
          }
        }
      } catch {
        // Write failed (e.g. transient RTDB error) — drop the lock so the next
        // tick retries naturally.
        pendingRef.current = null
      }
    }
  }, [isHost, code])
}
