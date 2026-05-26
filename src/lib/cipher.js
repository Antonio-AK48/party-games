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
function toArr(x) {
  if (!x) return []
  if (Array.isArray(x)) return x
  return Object.values(x)
}
