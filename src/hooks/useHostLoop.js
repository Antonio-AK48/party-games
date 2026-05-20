import { useEffect, useRef } from 'react'
import { startVoting, showResults, applyScores } from '../lib/rooms'
import { VOTE_MS, RESULTS_MS, allAnswersIn, allVotesIn, tallyRound } from '../lib/game'

const toArray = (x) => (!x ? [] : Array.isArray(x) ? x : Object.values(x))

// The host is the single writer for phase transitions. Every ~700ms it inspects
// the live room and advances the state machine when the current phase is done
// (everyone acted) or its deadline has passed. Non-host clients never run this.
//
// `pendingRef` holds the status we just wrote and are waiting to observe; we skip
// ticks until RTDB echoes it back, which prevents firing the same transition
// twice while a write is in flight. Consecutive statuses always differ in this
// flow (answering→voting→results→voting→…→scoreboard), so status equality is a
// sufficient signal.
export default function useHostLoop({ room, code, isHost }) {
  const roomRef = useRef(room)
  const pendingRef = useRef(null)

  // Keep the loop's view of the room current without re-arming the interval.
  useEffect(() => {
    roomRef.current = room
  }, [room])

  useEffect(() => {
    if (!isHost || !code) return
    const id = setInterval(tick, 700)
    return () => clearInterval(id)

    async function tick() {
      const r = roomRef.current
      if (!r?.meta) return
      const { status, round = 1, voteIndex = 0, phaseEndsAt } = r.meta

      if (pendingRef.current) {
        if (status === pendingRef.current) pendingRef.current = null
        else return
      }

      const players = Object.entries(r.players || {}).map(([uid, p]) => ({
        uid,
        score: p.score || 0,
      }))
      const uids = players.map((p) => p.uid)
      const matchups = toArray(r.rounds?.[round]?.matchups)
      const expired = phaseEndsAt ? Date.now() >= phaseEndsAt : false

      try {
        if (status === 'answering') {
          if (matchups.length && (allAnswersIn(matchups) || expired)) {
            pendingRef.current = 'voting'
            await startVoting(code, 0, VOTE_MS)
          }
        } else if (status === 'voting') {
          const m = matchups[voteIndex]
          if (m && (allVotesIn(m, uids) || expired)) {
            pendingRef.current = 'results'
            await showResults(code, RESULTS_MS)
          }
        } else if (status === 'results' && expired) {
          if (voteIndex + 1 < matchups.length) {
            pendingRef.current = 'voting'
            await startVoting(code, voteIndex + 1, VOTE_MS)
          } else {
            const gained = tallyRound(matchups)
            const scores = {}
            players.forEach((p) => {
              scores[p.uid] = p.score + (gained[p.uid] || 0)
            })
            pendingRef.current = 'scoreboard'
            await applyScores(code, scores)
          }
        }
      } catch {
        // Write failed — drop the lock so the next tick retries.
        pendingRef.current = null
      }
    }
  }, [isHost, code])
}
