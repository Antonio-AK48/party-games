import prompts from '../data/prompts'

// Tunables for the round flow. Durations are the host-side fallback deadlines —
// the host actually advances as soon as everyone has acted, so these only bite
// when someone is slow or disconnected.
export const ANSWER_MS = 90_000
export const VOTE_MS = 20_000
export const RESULTS_MS = 5_000
export const TOTAL_ROUNDS = 3
export const POINTS_PER_VOTE = 100

// Splash-screen durations between phases. Short enough not to be tedious, long
// enough for everyone to take in what's happening (and for late joiners on the
// same screen to load).
export const ROUND_INTRO_MS = 3_500
export const TIEBREAKER_SCORES_MS = 4_000
export const TIEBREAKER_VS_MS = 3_500

// Tie-breaker copy. The template's {opponent} gets filled in per-player with
// the other tied player's name; the vote header is the same for everyone.
export const TIEBREAKER_PROMPT_TEMPLATE = 'Roast {opponent} in one line. Best burn breaks the tie.'
export const TIEBREAKER_VOTE_HEADER = 'Best burn breaks the tie.'

// Returns the uids of every player tied for the top score. Empty array if the
// scores map is empty. Called after the final round to decide whether a
// tie-breaker is needed.
export function findTopTie(scores) {
  const entries = Object.entries(scores)
  if (entries.length === 0) return []
  const top = Math.max(...entries.map(([, s]) => s))
  return entries.filter(([, s]) => s === top).map(([uid]) => uid)
}

// RTDB returns integer-keyed objects as arrays, but a sparse/partial write can
// come back as a plain object — normalise both to an array.
const arr = (x) => (!x ? [] : Array.isArray(x) ? x : Object.values(x))

// Cycle pairing: player i is paired with player i+1 (wrapping), so every player
// authors exactly two matchups. The prompt offset walks the (shuffled) deck each
// round so rounds don't repeat prompts. promptOrder is a per-game shuffled list
// of indices into the prompts deck — set once at game start so all rounds draw
// from the same shuffled order, and each new game gets a different shuffle.
// Returns an array of { prompt, authors:[uid,uid] }. answers/votes are created
// lazily on first write (RTDB drops empty objects).
export function buildMatchups(players, round, promptOrder) {
  const n = players.length
  const offset = (round - 1) * n
  return players.map((p, i) => {
    const authors = [p.uid, players[(i + 1) % n].uid]
    const idx = promptOrder[(offset + i) % promptOrder.length]
    const template = prompts[idx]
    return { prompt: fillPrompt(template, authors, players), authors }
  })
}

// Returns a randomly-ordered list of indices into the prompts deck (e.g. for a
// 4-entry deck, something like [2, 0, 3, 1]). Called once when a game starts and
// stored on room.meta.promptOrder so every round draws from the same shuffle
// without repeating, and each new game sees a different order.
export function buildPromptOrder() {
  const indices = prompts.map((_, i) => i)
  for (let i = indices.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[indices[i], indices[j]] = [indices[j], indices[i]]
  }
  return indices
}

// Replace {player}/{player2} tokens with real names. Prefers players who aren't
// authoring this matchup (so nobody is forced to write about themselves), and
// falls back to the authors if there aren't enough others. Resolved once on the
// host and stored in RTDB, so all clients see the same filled-in prompt. A
// function replacement avoids `$`-in-name surprises with String.replace.
function fillPrompt(template, authorUids, players) {
  if (!template.includes('{player')) return template
  const shuffle = (a) =>
    a
      .map((v) => [Math.random(), v])
      .sort((x, y) => x[0] - y[0])
      .map((x) => x[1])
  const isAuthor = (p) => authorUids.includes(p.uid)
  const pool = [
    ...shuffle(players.filter((p) => !isAuthor(p)).map((p) => p.name)),
    ...shuffle(players.filter(isAuthor).map((p) => p.name)),
  ]
  const p1 = pool[0] || 'someone'
  const p2 = pool[1] || pool[0] || 'someone'
  return template
    .replace(/\{player2\}/g, () => p2)
    .replace(/\{player\}/g, () => p1)
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
