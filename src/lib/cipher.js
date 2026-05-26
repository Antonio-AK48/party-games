// ---- Cipher (Decode) game logic --------------------------------------------
// Standard Decrypto-style team game: two teams of 2–4, each holds 4 secret
// keywords (only their team sees them). Every round an encryptor on each team
// gets a 3-digit code (a permutation drawn from 1..4) and writes 3 clues — one
// per digit — hinting at their team's matching keyword. Both teams then try to
// guess BOTH codes from the clues. Correctly intercepting the opposing code =
// intercept token; failing to guess your own = miscommunication token. First to
// WIN_INTERCEPTS wins; LOSE_MISCOMS = loss; otherwise tied at MAX_ROUNDS goes
// to whoever has more intercepts.
//
// This module holds the pure helpers — no Firebase, no React. The round loop
// and writers live in rooms.js / useCipherHostLoop (added in the next phase).

import words from '../data/cipher_words'

export const CIPHER_MIN_PLAYERS = 4 // 2 v 2 minimum
export const CIPHER_MAX_PLAYERS = 8 // 4 v 4 ceiling
export const KEYWORDS_PER_TEAM = 4
export const CODE_LENGTH = 3
export const MAX_ROUNDS = 8
export const WIN_INTERCEPTS = 2
export const LOSE_MISCOMS = 2
// How long the reveal screen lingers after a round so everyone can read the
// codes, the clues, and who got intercepted / miscommed.
export const CIPHER_REVEAL_MS = 8_000

// Fisher-Yates copy-shuffle.
function shuffle(input) {
  const a = [...input]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

// Round-robin team assignment based on join order: 0→A, 1→B, 2→A, 3→B, …
// Keeps teams balanced no matter how many players (4–8). Pre-shuffle the list
// to avoid friend cliques always landing together.
export function assignTeams(playerUids) {
  const shuffled = shuffle(playerUids)
  const teamA = []
  const teamB = []
  shuffled.forEach((uid, i) => {
    if (i % 2 === 0) teamA.push(uid)
    else teamB.push(uid)
  })
  return { teamA, teamB }
}

// Draw 8 distinct keywords from the deck — 4 per team, no overlap.
export function drawKeywords() {
  const shuffled = shuffle(words)
  return {
    teamA: shuffled.slice(0, KEYWORDS_PER_TEAM),
    teamB: shuffled.slice(KEYWORDS_PER_TEAM, KEYWORDS_PER_TEAM * 2),
  }
}

// Random 3-digit code: permutation of 1..KEYWORDS_PER_TEAM, length CODE_LENGTH,
// no repeats within the code (so e.g. [3,1,4] but never [3,3,1]).
export function generateCode() {
  return shuffle([1, 2, 3, 4]).slice(0, CODE_LENGTH)
}

// Which team member writes clues this round — rotates evenly by round number
// (1-indexed). Returns null for an empty team.
export function pickEncryptor(teamPlayers, round) {
  const arr = teamPlayers || []
  if (arr.length === 0) return null
  return arr[(round - 1) % arr.length]
}

// Initial cipher state stored at rooms/{code}/cipher when the host starts a
// Decode game. The round loop (clues/guesses/reveal) fills in the rest.
export function buildInitialCipherState(playerUids) {
  const teams = assignTeams(playerUids)
  const kw = drawKeywords()
  return {
    teamA: {
      players: teams.teamA,
      keywords: kw.teamA,
      intercepts: 0,
      miscoms: 0,
    },
    teamB: {
      players: teams.teamB,
      keywords: kw.teamB,
      intercepts: 0,
      miscoms: 0,
    },
    round: 1,
    history: [], // filled with { round, codes, clues, guesses, result } per round
  }
}

// Which team this uid belongs to in the given cipher state, or null.
export function teamOf(uid, cipher) {
  if (!uid || !cipher) return null
  if (toArr(cipher.teamA?.players).includes(uid)) return 'A'
  if (toArr(cipher.teamB?.players).includes(uid)) return 'B'
  return null
}

// RTDB normalises integer-keyed arrays into plain objects on read — turn either
// shape back into a plain array.
export function toArr(x) {
  if (!x) return []
  if (Array.isArray(x)) return x
  return Object.values(x)
}

// Strict per-index match of two coded sequences (handles RTDB array-as-object).
function codesMatch(a, b) {
  const ax = toArr(a)
  const bx = toArr(b)
  if (ax.length !== bx.length || ax.length === 0) return false
  return ax.every((v, i) => Number(v) === Number(bx[i]))
}

// Evaluate one completed round's guesses against the actual codes.
// `roundData` shape: { codes: { A, B }, guesses: { A: { own, opp }, B: same } }.
// Returns per-team flags: { ownCorrect, oppCorrect, gotIntercept, gotMiscom }.
// gotIntercept = correctly guessed the opposing team's code (earns a token).
// gotMiscom    = failed to guess your own code (earns a miscommunication token).
export function evaluateRound(roundData) {
  const codes = roundData?.codes || {}
  const guesses = roundData?.guesses || {}
  const A_own = codesMatch(guesses.A?.own, codes.A)
  const A_opp = codesMatch(guesses.A?.opp, codes.B)
  const B_own = codesMatch(guesses.B?.own, codes.B)
  const B_opp = codesMatch(guesses.B?.opp, codes.A)
  return {
    A: { ownCorrect: A_own, oppCorrect: A_opp, gotIntercept: A_opp, gotMiscom: !A_own },
    B: { ownCorrect: B_own, oppCorrect: B_opp, gotIntercept: B_opp, gotMiscom: !B_own },
  }
}

// Has the game ended after this round? Standard Decrypto: WIN_INTERCEPTS to win,
// LOSE_MISCOMS to lose. If both teams hit thresholds the same round, more
// intercepts wins (tie if equal). At MAX_ROUNDS, more intercepts wins.
// Returns { ended: true, winner: 'A' | 'B' | 'tie' } or { ended: false }.
export function checkWinner(teamA, teamB, round) {
  const aI = teamA?.intercepts || 0
  const bI = teamB?.intercepts || 0
  const aM = teamA?.miscoms || 0
  const bM = teamB?.miscoms || 0
  // Team gets a "good outcome" if it hit WIN_INTERCEPTS itself OR its opponent
  // hit LOSE_MISCOMS this round. Both at once = tiebreaker by intercepts.
  const aGood = aI >= WIN_INTERCEPTS || bM >= LOSE_MISCOMS
  const bGood = bI >= WIN_INTERCEPTS || aM >= LOSE_MISCOMS
  const tiebreak = () => {
    if (aI > bI) return 'A'
    if (bI > aI) return 'B'
    return 'tie'
  }
  if (aGood && bGood) return { ended: true, winner: tiebreak() }
  if (aGood) return { ended: true, winner: 'A' }
  if (bGood) return { ended: true, winner: 'B' }
  if (round >= MAX_ROUNDS) return { ended: true, winner: tiebreak() }
  return { ended: false }
}

// Validate a 3-digit guess: length CODE_LENGTH, each digit 1..KEYWORDS_PER_TEAM,
// no repeats. Used in the guess UI to gate "Submit."
export function isValidCode(code) {
  const arr = toArr(code).map(Number)
  if (arr.length !== CODE_LENGTH) return false
  if (arr.some((n) => !Number.isInteger(n) || n < 1 || n > KEYWORDS_PER_TEAM)) {
    return false
  }
  return new Set(arr).size === arr.length
}
