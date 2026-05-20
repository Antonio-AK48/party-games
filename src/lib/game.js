import prompts from '../data/prompts'

// Tunables for the round flow. Durations are the host-side fallback deadlines —
// the host actually advances as soon as everyone has acted, so these only bite
// when someone is slow or disconnected.
export const ANSWER_MS = 90_000
export const VOTE_MS = 20_000
export const RESULTS_MS = 5_000
export const TOTAL_ROUNDS = 3
export const POINTS_PER_VOTE = 100

// RTDB returns integer-keyed objects as arrays, but a sparse/partial write can
// come back as a plain object — normalise both to an array.
const arr = (x) => (!x ? [] : Array.isArray(x) ? x : Object.values(x))

// Cycle pairing: player i is paired with player i+1 (wrapping), so every player
// authors exactly two matchups. The prompt offset walks the deck each round so
// rounds don't repeat prompts. Returns an array of { prompt, authors:[uid,uid] }.
// answers/votes are created lazily on first write (RTDB drops empty objects).
export function buildMatchups(players, round) {
  const n = players.length
  const offset = (round - 1) * n
  return players.map((p, i) => ({
    prompt: prompts[(offset + i) % prompts.length],
    authors: [p.uid, players[(i + 1) % n].uid],
  }))
}

// Every author of every matchup has submitted an answer.
export function allAnswersIn(matchups) {
  return matchups.every((m) => {
    const answers = m.answers || {}
    return arr(m.authors).every((uid) => answers[uid] != null)
  })
}

// Everyone who isn't an author of this matchup has cast a vote on it.
export function allVotesIn(matchup, playerUids) {
  const authors = arr(matchup.authors)
  const voters = playerUids.filter((uid) => !authors.includes(uid))
  if (voters.length === 0) return true
  const votes = matchup.votes || {}
  return voters.every((uid) => votes[uid] != null)
}

// Points earned this round, keyed by author uid (one award per vote received).
export function tallyRound(matchups) {
  const out = {}
  matchups.forEach((m) => {
    Object.values(m.votes || {}).forEach((authorUid) => {
      out[authorUid] = (out[authorUid] || 0) + POINTS_PER_VOTE
    })
  })
  return out
}
