import { useEffect, useRef } from 'react'
import {
  startAnswering,
  startVoting,
  showResults,
  applyScores,
  startTiebreaker,
  showTiebreakerVersus,
  startTiebreakerAnswering,
  startTiebreakerVoting,
  showTiebreakerResults,
} from '../lib/rooms'
import {
  ANSWER_MS,
  VOTE_MS,
  RESULTS_MS,
  TIEBREAKER_VS_MS,
  TOTAL_ROUNDS,
  allAnswersIn,
  allVotesIn,
  tallyRound,
  findTopTie,
} from '../lib/game'

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
        if (status === 'round-intro' && expired) {
          pendingRef.current = 'answering'
          await startAnswering(code, ANSWER_MS)
        } else if (status === 'tiebreaker-scores' && expired) {
          pendingRef.current = 'tiebreaker-versus'
          await showTiebreakerVersus(code, TIEBREAKER_VS_MS)
        } else if (status === 'tiebreaker-versus' && expired) {
          pendingRef.current = 'tiebreaker-answering'
          await startTiebreakerAnswering(code, ANSWER_MS)
        } else if (status === 'answering') {
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
            const gained = tallyRound(matchups, round)
            const scores = {}
            players.forEach((p) => {
              scores[p.uid] = p.score + (gained[p.uid] || 0)
            })
            // Final-round 2-way tie at the top? Run a roast tie-breaker — but
            // only if there's at least one non-tied player around to vote on
            // it. 3+ way ties (and the edge case of 2 total players tying)
            // fall through to scoreboard as a shared win.
            const isFinal = round >= TOTAL_ROUNDS
            const tied = isFinal ? findTopTie(scores) : []
            if (tied.length === 2 && uids.length > 2) {
              pendingRef.current = 'tiebreaker-scores'
              await startTiebreaker(code, scores, tied)
            } else {
              pendingRef.current = 'scoreboard'
              await applyScores(code, scores)
            }
          }
        } else if (status === 'tiebreaker-answering') {
          const tb = r.tiebreaker || {}
          const authors = toArray(tb.authors)
          const answers = tb.answers || {}
          const allIn =
            authors.length > 0 && authors.every((u) => answers[u] != null)
          if (allIn || expired) {
            pendingRef.current = 'tiebreaker-voting'
            await startTiebreakerVoting(code, VOTE_MS)
          }
        } else if (status === 'tiebreaker-voting') {
          const tb = r.tiebreaker || {}
          const authors = toArray(tb.authors)
          const voters = uids.filter((u) => !authors.includes(u))
          const votes = tb.votes || {}
          const allVoted =
            voters.length === 0 || voters.every((u) => votes[u] != null)
          if (allVoted || expired) {
            pendingRef.current = 'tiebreaker-results'
            await showTiebreakerResults(code, RESULTS_MS)
          }
        } else if (status === 'tiebreaker-results' && expired) {
          // Pick the roaster with the most votes; ties (rare — vote tie inside
          // a tie-breaker) resolve to the first author by deterministic order.
          const tb = r.tiebreaker || {}
          const authors = toArray(tb.authors)
          const votes = tb.votes || {}
          const tally = {}
          Object.values(votes).forEach((authorUid) => {
            tally[authorUid] = (tally[authorUid] || 0) + 1
          })
          const winner = authors.reduce(
            (best, uid) =>
              (tally[uid] || 0) > (tally[best] || 0) ? uid : best,
            authors[0]
          )
          const finalScores = {}
          players.forEach((p) => {
            finalScores[p.uid] = p.score
          })
          finalScores[winner] = (finalScores[winner] || 0) + 1
          pendingRef.current = 'scoreboard'
          await applyScores(code, finalScores)
        }
      } catch {
        // Write failed — drop the lock so the next tick retries.
        pendingRef.current = null
      }
    }
  }, [isHost, code])
}
