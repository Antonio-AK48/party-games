import prompts from '../data/prompts'

// Tunables for the round flow. Durations are the host-side fallback deadlines —
// the host actually advances as soon as everyone has acted, so these only bite
// when someone is slow or disconnected.
export const ANSWER_MS = 90_000
export const VOTE_MS = 20_000
export const RESULTS_MS = 5_000
export const TOTAL_ROUNDS = 3
// Each matchup opens with a short read-only window: votes are locked so everyone
// takes in the prompt + answers first, and it's the only time a player may step
// in (see intervention below). The host doesn't start the VOTE_MS clock until
// this window — and any in-flight intervention — has cleared (see isVotingLocked).
export const VOTE_LOCK_MS = 6_000
export const POINTS_PER_VOTE = 100
// Later rounds are worth more (points = POINTS_PER_VOTE * round) so a player who
// fell behind early can still mount a comeback in the final round. And sweeping
// a matchup — winning EVERY vote when at least SWEEP_MIN_VOTERS people voted —
// adds a SWEEP_BONUS_PCT bonus on top of that matchup's points. See scoreMatchup.
export const SWEEP_BONUS_PCT = 0.5
export const SWEEP_MIN_VOTERS = 2

// ---- Experimental wagers: betting + intervention (see lib/features.js) -------
// Both are under playtest and may be removed. Values are intentionally simple to
// reason about during a live game — tune freely. See settleMatchupWagers below.
//   Betting:      round 1 starts everyone at 0, so betting opens in round 2.
//                 Even money — win +stake, lose −stake. Flat stake (one vote's
//                 worth, not round-scaled) so a player who authors multiple
//                 matchups can wager on each separately. The Game UI tracks
//                 outstanding bet exposure so the total wagered in a round can
//                 never exceed the player's actual pool.
//   Intervention: a voter becomes a third author, so it needs a crowd (≥6) and
//                 the current top 2 are barred (anti-snowball + anti-spite).
export const BET_FROM_ROUND = 2
export const INTERVENTION_MIN_PLAYERS = 6
export const INTERVENTION_EXCLUDE_TOP = 2
// Once a player claims the intervention slot during the read window, voting stays
// locked for everyone until they submit — so no vote can ever land before an
// intervention does. This caps how long that hold lasts (and how long the
// claimer has to type) so an abandoned claim can't freeze the matchup.
export const INTERVENTION_TYPE_MS = 20_000
// Even-money self-bet: win +stake / lose −stake, settled vs. your co-author only.
export const BET_STAKE = POINTS_PER_VOTE
// Risk-bet intervention: win +stake (strictly most votes) / lose −stake (dead last).
export const interventionStake = (round) => POINTS_PER_VOTE * round * 2

// ---- Round 3: "Author's Cut" — player-written prompts -----------------------
// Every player writes one prompt; each prompt is then answered by
// R3_ANSWERS_PER_PROMPT random non-authors (cyclic assignment so the load is
// even); the prompt's author privately picks their favorite. Each chosen answer
// pays R3_CHOSEN_POINTS. Sits outside the matchup engine — see the round3-*
// statuses in useHostLoop and the Round3Judging / Round3Reveal components.
export const R3_PROMPT_MS = 45_000
export const R3_ANSWER_MS = 90_000
export const R3_JUDGE_MS = 25_000
export const R3_REVEAL_MS = 5_000
export const R3_ANSWERS_PER_PROMPT = 3
export const R3_CHOSEN_POINTS = 500

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
  const used = []
  const matchups = players.map((p, i) => {
    const authors = [p.uid, players[(i + 1) % n].uid]
    const idx = promptOrder[(offset + i) % promptOrder.length]
    used.push(idx)
    const template = prompts[idx]
    return { prompt: fillPrompt(template, authors, players), authors }
  })
  // Remember what this round showed so future games can avoid it (host-only;
  // see buildPromptOrder). No-op if localStorage is unavailable.
  rememberUsed(used)
  return matchups
}

// ---- Cross-game no-repeat memory -------------------------------------------
// A "new game" is a brand-new room with its own fresh shuffle, so on its own
// nothing stops the same group from re-drawing prompts they just had last game.
// We remember the prompt indices used recently (in this browser — the host
// starts every game) and push them to the back of the next shuffle, so a fresh
// game prefers prompts the group hasn't seen lately. Indices are safe keys
// because the deck doesn't change mid-night.
const RECENT_KEY = 'pg.recentPrompts'
const RECENT_CAP = 120 // ~ a few games' worth; how long a prompt stays "cold"

function recentlyUsed() {
  try {
    const raw = localStorage.getItem(RECENT_KEY)
    const arr = raw ? JSON.parse(raw) : []
    return Array.isArray(arr) ? arr : []
  } catch {
    return [] // localStorage unavailable (private mode, SSR) — degrade to plain shuffle
  }
}

// Append the indices just used and keep only the most recent RECENT_CAP, de-duped
// (last occurrence wins). Called as each round's matchups are built.
function rememberUsed(indices) {
  try {
    const merged = [...recentlyUsed(), ...indices]
    const seen = new Set()
    const trimmed = []
    for (let i = merged.length - 1; i >= 0 && trimmed.length < RECENT_CAP; i--) {
      if (!seen.has(merged[i])) {
        seen.add(merged[i])
        trimmed.unshift(merged[i])
      }
    }
    localStorage.setItem(RECENT_KEY, JSON.stringify(trimmed))
  } catch {
    // no-op: nothing remembered, next game just falls back to a plain shuffle
  }
}

// Returns a randomly-ordered list of indices into the prompts deck (e.g. for a
// 4-entry deck, something like [2, 0, 3, 1]). Called once when a game starts and
// stored on room.meta.promptOrder so every round draws from the same shuffle
// without repeating, and each new game sees a different order. Prompts used in
// recent games are stable-partitioned to the back so a fresh game prefers ones
// the group hasn't seen lately (see recentlyUsed/rememberUsed).
export function buildPromptOrder() {
  const indices = prompts.map((_, i) => i)
  for (let i = indices.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[indices[i], indices[j]] = [indices[j], indices[i]]
  }
  const recent = new Set(recentlyUsed())
  const fresh = indices.filter((i) => !recent.has(i))
  const stale = indices.filter((i) => recent.has(i))
  // If every prompt is "recent" (very long night), fresh is empty and this is
  // just the plain random shuffle — exactly the old behaviour.
  return [...fresh, ...stale]
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

// Voting on a matchup is locked while either (a) the opening read window is still
// running, or (b) someone has claimed the intervention slot and is still typing
// it in (their claim hasn't been filled and hasn't timed out). Releasing only
// once both clear is what guarantees no vote precedes an intervention. Treats a
// missing voteLockEndsAt as "window already over" so older rooms behave normally.
export function isVotingLocked(matchup, voteLockEndsAt, now) {
  if (voteLockEndsAt && now < voteLockEndsAt) return true
  const claim = matchup?.interventionClaim
  if (
    claim &&
    !matchup.intervention &&
    now < (claim.at || 0) + INTERVENTION_TYPE_MS
  ) {
    return true
  }
  return false
}

// Everyone who isn't an author of this matchup has cast a vote on it. An
// intervener becomes a third author (and forfeits their vote), so they're
// excluded from the expected voters too.
export function allVotesIn(matchup, playerUids) {
  const authors = arr(matchup.authors)
  const ivUid = matchup.intervention?.uid
  const voters = playerUids.filter((uid) => !authors.includes(uid) && uid !== ivUid)
  if (voters.length === 0) return true
  const votes = matchup.votes || {}
  return voters.every((uid) => votes[uid] != null)
}

// Points a single vote is worth in this round. Round 1 = 1x, round 2 = 2x, etc.
export function pointsPerVote(round) {
  return POINTS_PER_VOTE * round
}

// Short label for the round's point multiplier, for the UI ('Double points',
// 'Triple points', …). Returns null for round 1 (nothing to advertise).
export function multiplierLabel(round) {
  if (round <= 1) return null
  if (round === 2) return 'Double points'
  if (round === 3) return 'Triple points'
  return `${round}× points`
}

// Per-author score breakdown for one matchup: { uid, votes, base, sweep, bonus,
// total }. A "sweep" is winning every vote cast when at least SWEEP_MIN_VOTERS
// people voted (a lone voter doesn't count) — it adds a SWEEP_BONUS_PCT bonus.
export function scoreMatchup(matchup, round) {
  const votes = matchup.votes || {}
  const authors = arr(matchup.authors)
  const voterCount = Object.keys(votes).length
  const per = pointsPerVote(round)
  return authors.map((uid) => {
    const v = Object.values(votes).filter((a) => a === uid).length
    const base = v * per
    const sweep = voterCount >= SWEEP_MIN_VOTERS && v === voterCount
    const bonus = sweep ? Math.round(base * SWEEP_BONUS_PCT) : 0
    return { uid, votes: v, base, sweep, bonus, total: base + bonus }
  })
}

// Points earned this round, keyed by author uid: votes scaled by the round
// multiplier, plus any sweep bonuses.
export function tallyRound(matchups, round) {
  const out = {}
  matchups.forEach((m) => {
    scoreMatchup(m, round).forEach(({ uid, total }) => {
      out[uid] = (out[uid] || 0) + total
    })
  })
  return out
}

// ---- Experimental wagers (betting + intervention) --------------------------
// Kept entirely separate from the base scoring above so the whole experiment can
// be switched off (lib/features.js) or deleted without disturbing tallyRound.

// Uids of the top n players by score, from a players map ({ uid: { score } }).
// Used to bar the current leaders from intervening (INTERVENTION_EXCLUDE_TOP).
export function topScorerUids(playersMap, n) {
  return new Set(
    Object.entries(playersMap || {})
      .map(([uid, p]) => [uid, (p && p.score) || 0])
      .sort((a, b) => b[1] - a[1])
      .slice(0, n)
      .map(([uid]) => uid)
  )
}

// Resolve one matchup's wagers for both display and scoring.
//   bets:         settled author-vs-author ONLY — an intervention's votes never
//                 touch a bet, so a hidden bet stays the fair 1v1 it was placed
//                 as. win = more votes than your co-author, lose = fewer, push =
//                 tie. Even money (delta = ±stake).
//   intervention: settled against the field — win = strictly the most votes of
//                 all answers, lose = strictly the fewest (dead last), push =
//                 anything in between. Reward/risk = ±stake; no base points.
// result is 'win' | 'lose' | 'push'; delta is the signed point change.
export function settleMatchupWagers(matchup) {
  const authors = arr(matchup.authors)
  const votes = matchup.votes || {}
  const countFor = (uid) => Object.values(votes).filter((a) => a === uid).length

  const bets = {}
  if (authors.length === 2) {
    const [a, b] = authors
    const va = countFor(a)
    const vb = countFor(b)
    Object.entries(matchup.bets || {}).forEach(([uid, stake]) => {
      const mine = uid === a ? va : vb
      const theirs = uid === a ? vb : va
      const result = mine > theirs ? 'win' : mine < theirs ? 'lose' : 'push'
      bets[uid] = {
        stake,
        result,
        delta: result === 'win' ? stake : result === 'lose' ? -stake : 0,
      }
    })
  }

  let intervention = null
  const iv = matchup.intervention
  if (iv && iv.uid != null) {
    const ivVotes = countFor(iv.uid)
    const authorVotes = authors.map(countFor)
    const result = authorVotes.every((v) => ivVotes > v)
      ? 'win'
      : authorVotes.every((v) => ivVotes < v)
        ? 'lose'
        : 'push'
    intervention = {
      uid: iv.uid,
      stake: iv.stake,
      votes: ivVotes,
      result,
      delta: result === 'win' ? iv.stake : result === 'lose' ? -iv.stake : 0,
    }
  }

  return { bets, intervention }
}

// Net point deltas from every matchup's wagers, keyed by uid (can be negative).
// Returns {} for a round with no bets or interventions, so it's a no-op when the
// features are off (no such data is ever written).
export function settleWagers(matchups) {
  const out = {}
  const add = (uid, d) => {
    if (d) out[uid] = (out[uid] || 0) + d
  }
  matchups.forEach((m) => {
    const { bets, intervention } = settleMatchupWagers(m)
    Object.entries(bets).forEach(([uid, b]) => add(uid, b.delta))
    if (intervention) add(intervention.uid, intervention.delta)
  })
  return out
}

// ---- Round 3 helpers --------------------------------------------------------

// Turn the raw { uid: { text } } prompt submissions into the per-item structure
// used for the rest of round 3. Each item gets `assigned`: the next k players in
// the (shuffled) order, so every player ends up answering exactly k prompts and
// every prompt receives exactly k answers. k clamps down gracefully if the room
// has fewer than R3_ANSWERS_PER_PROMPT+1 players.
export function buildRound3Items(prompts) {
  const list = []
  Object.entries(prompts || {}).forEach(([author, p]) => {
    if (p && p.text) list.push({ author, text: p.text })
  })
  for (let i = list.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[list[i], list[j]] = [list[j], list[i]]
  }
  const n = list.length
  const k = Math.min(R3_ANSWERS_PER_PROMPT, Math.max(0, n - 1))
  return list.map((item, i) => ({
    author: item.author,
    text: item.text,
    assigned: Array.from({ length: k }, (_, j) => list[(i + 1 + j) % n].author),
  }))
}

// Every player submitted a prompt.
export function allRound3PromptsIn(prompts, playerUids) {
  return playerUids.every((uid) => prompts && prompts[uid] && prompts[uid].text)
}

// Every item has every assigned answerer's response in.
export function allRound3AnswersIn(items) {
  return items.every((it) =>
    arr(it.assigned).every((uid) => it.answers && it.answers[uid] != null)
  )
}

// Every item has a chosen winner picked (used to end judging early).
export function allRound3Chosen(items) {
  return items.every((it) => it.chosen != null)
}

// Round 3 scoring: each chosen answerer banks a flat R3_CHOSEN_POINTS.
export function tallyRound3(items) {
  const out = {}
  ;(items || []).forEach((it) => {
    if (it.chosen) out[it.chosen] = (out[it.chosen] || 0) + R3_CHOSEN_POINTS
  })
  return out
}
