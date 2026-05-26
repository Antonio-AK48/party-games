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
  startRound3Prompts,
  startRound3Answering,
  startRound3Judging,
  showRound3Reveal,
  autopickRound3,
} from '../lib/rooms'
import {
  ANSWER_MS,
  VOTE_MS,
  RESULTS_MS,
  TIEBREAKER_VS_MS,
  TOTAL_ROUNDS,
  R3_PROMPT_MS,
  R3_ANSWER_MS,
  R3_JUDGE_MS,
  R3_REVEAL_MS,
  allAnswersIn,
  allVotesIn,
  tallyRound,
  settleWagers,
  findTopTie,
  allRound3PromptsIn,
  allRound3AnswersIn,
  tallyRound3,
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
      const { status, round = 1, voteIndex = 0, judgeIndex = 0, phaseEndsAt } = r.meta

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
          // Round 3 = Author's Cut: player-written prompts instead of matchups.
          if (round === TOTAL_ROUNDS) {
            pendingRef.current = 'round3-prompts'
            await startRound3Prompts(code, R3_PROMPT_MS)
          } else {
            pendingRef.current = 'answering'
            await startAnswering(code, ANSWER_MS)
          }
        } else if (status === 'round3-prompts') {
          const prompts = r.round3?.prompts || {}
          if (allRound3PromptsIn(prompts, uids) || expired) {
            pendingRef.current = 'round3-answering'
            await startRound3Answering(code, R3_ANSWER_MS)
          }
        } else if (status === 'round3-answering') {
          const items = toArray(r.round3?.items)
          if (items.length && (allRound3AnswersIn(items) || expired)) {
            pendingRef.current = 'round3-judging'
            await startRound3Judging(code, 0, R3_JUDGE_MS)
          }
        } else if (status === 'round3-judging') {
          // Sequential: every player reads the same prompt together while its
          // author picks the winner. Advance when this single item is chosen
          // (or autopick it if its timer ran out).
          const items = toArray(r.round3?.items)
          const it = items[judgeIndex]
          if (it && (it.chosen != null || expired)) {
            if (expired && it.chosen == null) {
              await autopickRound3(code, items, judgeIndex)
            }
            pendingRef.current = 'round3-results'
            await showRound3Reveal(code, judgeIndex, R3_REVEAL_MS)
          }
        } else if (status === 'round3-results' && expired) {
          const items = toArray(r.round3?.items)
          if (judgeIndex + 1 < items.length) {
            pendingRef.current = 'round3-judging'
            await startRound3Judging(code, judgeIndex + 1, R3_JUDGE_MS)
          } else {
            const gained = tallyRound3(items)
            const scores = {}
            players.forEach((p) => {
              scores[p.uid] = Math.max(0, p.score + (gained[p.uid] || 0))
            })
            const tied = findTopTie(scores)
            if (tied.length === 2 && uids.length > 2) {
              pendingRef.current = 'tiebreaker-scores'
              await startTiebreaker(code, scores, tied)
            } else {
              pendingRef.current = 'scoreboard'
              await applyScores(code, scores)
            }
          }
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
            // Experimental: even-money bets + risk-bet interventions. Returns {}
            // when no wagers were placed, so this is a no-op with features off.
            // Deltas can be negative; clamp scores at 0 so a lost wager can't
            // push anyone below zero.
            const wagers = settleWagers(matchups)
            const scores = {}
            players.forEach((p) => {
              const delta = (gained[p.uid] || 0) + (wagers[p.uid] || 0)
              scores[p.uid] = Math.max(0, p.score + delta)
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
