import {
  ref,
  get,
  set,
  update,
  onValue,
  remove,
  runTransaction,
  serverTimestamp,
} from 'firebase/database'
import { db, ensureAuth } from './firebase'
import {
  buildMatchups,
  buildPromptOrder,
  buildRound3Items,
  ROUND_INTRO_MS,
  TIEBREAKER_SCORES_MS,
  TOTAL_ROUNDS,
} from './game'
import {
  buildInitialCipherState,
  CIPHER_MIN_PLAYERS,
  CIPHER_REVEAL_MS,
  generateCode,
  pickEncryptor,
  toArr as cipherToArr,
} from './cipher'

// ---- Room data model (Realtime Database) -----------------------------------
// rooms/{CODE}
//   meta:    { status, hostId, round, voteIndex, phaseEndsAt, createdAt }
//   players: { {uid}: { name, score, isHost, joinedAt } }
//   rounds:  { {round}: { matchups: [ { prompt, authors:[uid,uid],
//                                       answers:{uid:text}, votes:{voter:author} } ] } }
// status: 'lobby' | 'answering' | 'voting' | 'results' | 'scoreboard'
// Transitions are host-authoritative (see useHostLoop); players only ever write
// their own answer/vote and the host writes meta + scores.
// ----------------------------------------------------------------------------

const CODE_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'

function randomCode() {
  return Array.from(
    { length: 4 },
    () => CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)]
  ).join('')
}

// Generate a code that isn't already taken. A few tries is plenty at MVP scale.
async function freshCode() {
  for (let i = 0; i < 6; i++) {
    const code = randomCode()
    const snap = await get(ref(db, `rooms/${code}/meta`))
    if (!snap.exists()) return code
  }
  throw new Error('Could not allocate a free room code, please try again')
}

// ---- Lobby -----------------------------------------------------------------

// gameType picks which game lives in this room — 'captions' (Quiplash-style,
// the default) or 'cipher' (Decode). Lobby + game routing branch on this.
export async function createRoom(name, gameType = 'captions') {
  const uid = await ensureAuth()
  const code = await freshCode()
  await set(ref(db, `rooms/${code}`), {
    meta: {
      status: 'lobby',
      gameType,
      hostId: uid,
      round: 0,
      createdAt: serverTimestamp(),
    },
    players: {
      [uid]: {
        name,
        avatar: null, // chosen in the lobby (see claimAvatar)
        score: 0,
        isHost: true,
        joinedAt: serverTimestamp(),
      },
    },
  })
  return { code, uid }
}

export async function joinRoom(name, code) {
  const uid = await ensureAuth()
  const [metaSnap, playerSnap] = await Promise.all([
    get(ref(db, `rooms/${code}/meta`)),
    get(ref(db, `rooms/${code}/players/${uid}`)),
  ])
  if (!metaSnap.exists()) throw new Error("That room doesn't exist")
  const alreadyIn = playerSnap.exists()
  // New players can only join during the lobby; existing players may rejoin
  // anytime (e.g. after a refresh mid-game).
  if (!alreadyIn && metaSnap.val().status !== 'lobby') {
    throw new Error('That game has already started')
  }
  if (alreadyIn) {
    // Rejoin: only refresh the name, never touch a previously-picked avatar.
    await update(ref(db, `rooms/${code}/players/${uid}`), { name })
  } else {
    await update(ref(db, `rooms/${code}/players/${uid}`), {
      name,
      avatar: null, // chosen in the lobby (see claimAvatar)
      score: 0,
      isHost: false,
      joinedAt: serverTimestamp(),
    })
  }
  return { code, uid }
}

// Claim an avatar for this player, but only if no one else in the room already
// has it. Runs as a transaction on the players node so two people confirming the
// same avatar at the same time can't both win — the loser is told to pick again.
export async function claimAvatar(code, uid, avatarId) {
  const playersRef = ref(db, `rooms/${code}/players`)
  const res = await runTransaction(playersRef, (players) => {
    if (!players || !players[uid]) return players // nothing to update
    if (avatarId) {
      const takenByOther = Object.entries(players).some(
        ([id, p]) => id !== uid && p && p.avatar === avatarId
      )
      if (takenByOther) return undefined // abort: someone beat us to it
    }
    players[uid].avatar = avatarId || null
    return players
  })
  if (!res.committed) {
    throw new Error('That avatar was just taken — pick another')
  }
}

// Is this uid still a member of the room? Used to validate a remembered session
// before auto-rejoining.
export async function playerExists(code, uid) {
  const snap = await get(ref(db, `rooms/${code}/players/${uid}`))
  return snap.exists()
}

// Subscribe to the whole room. Returns the unsubscribe function.
export function subscribeRoom(code, cb) {
  return onValue(ref(db, `rooms/${code}`), (snap) => cb(snap.val()))
}

export async function leaveRoom(code, uid) {
  await remove(ref(db, `rooms/${code}/players/${uid}`))
}

// ---- Round lifecycle (host) ------------------------------------------------

async function playersOrdered(code) {
  const snap = await get(ref(db, `rooms/${code}/players`))
  const val = snap.val() || {}
  return Object.entries(val)
    .map(([uid, p]) => ({ uid, name: p.name, joinedAt: p.joinedAt || 0 }))
    .sort((a, b) => a.joinedAt - b.joinedAt)
}

// Build a round's matchups and open the round-intro splash. The host loop then
// auto-advances to 'answering' once the splash duration elapses. Matchups are
// written here (not later) so all clients can pre-load them during the splash.
//
// Round TOTAL_ROUNDS uses the Author's Cut format instead (player-written
// prompts) — no matchups, no promptOrder draw; the host loop branches into the
// round3-* phases when the intro expires.
async function beginRound(code, round) {
  if (round === TOTAL_ROUNDS) {
    await update(ref(db), {
      [`rooms/${code}/meta/status`]: 'round-intro',
      [`rooms/${code}/meta/round`]: round,
      [`rooms/${code}/meta/voteIndex`]: 0,
      [`rooms/${code}/meta/judgeIndex`]: 0,
      [`rooms/${code}/meta/phaseEndsAt`]: Date.now() + ROUND_INTRO_MS,
      [`rooms/${code}/round3`]: null, // wipe any stragglers from a prior game
    })
    return
  }
  const [players, orderSnap] = await Promise.all([
    playersOrdered(code),
    get(ref(db, `rooms/${code}/meta/promptOrder`)),
  ])
  const matchups = buildMatchups(players, round, orderSnap.val())
  await update(ref(db), {
    [`rooms/${code}/rounds/${round}/matchups`]: matchups,
    [`rooms/${code}/meta/status`]: 'round-intro',
    [`rooms/${code}/meta/round`]: round,
    [`rooms/${code}/meta/voteIndex`]: 0,
    [`rooms/${code}/meta/phaseEndsAt`]: Date.now() + ROUND_INTRO_MS,
  })
}

// Splash → answering. Called by the host loop when the round-intro deadline
// passes. Kept as a tiny helper so the host loop stays declarative.
export async function startAnswering(code, durationMs) {
  await update(ref(db, `rooms/${code}/meta`), {
    status: 'answering',
    phaseEndsAt: Date.now() + durationMs,
  })
}

export async function startGame(code) {
  const metaSnap = await get(ref(db, `rooms/${code}/meta`))
  const meta = metaSnap.val() || {}
  if (meta.gameType === 'cipher') return startCipherGame(code)
  // Default = captions (Quiplash-style).
  await update(ref(db, `rooms/${code}/meta`), {
    promptOrder: buildPromptOrder(),
  })
  return beginRound(code, 1)
}

// Decode (cipher) game start: auto-assigns teams, draws 4 keywords per team,
// and lands the room ready for the cipher host loop to kick off round 1.
async function startCipherGame(code) {
  const players = await playersOrdered(code)
  const uids = players.map((p) => p.uid)
  if (uids.length < CIPHER_MIN_PLAYERS) {
    throw new Error(`Decode needs at least ${CIPHER_MIN_PLAYERS} players`)
  }
  const initial = buildInitialCipherState(uids)
  await update(ref(db), {
    [`rooms/${code}/cipher`]: initial,
    [`rooms/${code}/meta/status`]: 'cipher-active',
    [`rooms/${code}/meta/round`]: initial.round,
    [`rooms/${code}/meta/phaseEndsAt`]: null,
  })
}

// ---- Cipher (Decode) phase writers -----------------------------------------
// All called by useCipherHostLoop on the host's tick except submitCipherClues,
// updateCipherGuess, and lockCipherGuess which are direct player actions.

// Open a new round: pick encryptors (round-robin within each team), generate
// fresh 3-digit codes for both teams, switch to the clues phase.
export async function startCipherRound(code, round, cipherState) {
  const teamAPlayers = cipherToArr(cipherState?.teamA?.players)
  const teamBPlayers = cipherToArr(cipherState?.teamB?.players)
  const encryptors = {
    A: pickEncryptor(teamAPlayers, round),
    B: pickEncryptor(teamBPlayers, round),
  }
  const codes = {
    A: generateCode(),
    B: generateCode(),
  }
  await update(ref(db), {
    [`rooms/${code}/cipher/rounds/${round}/codes`]: codes,
    [`rooms/${code}/cipher/rounds/${round}/encryptors`]: encryptors,
    [`rooms/${code}/cipher/round`]: round,
    [`rooms/${code}/meta/round`]: round,
    [`rooms/${code}/meta/status`]: 'cipher-clues',
    [`rooms/${code}/meta/phaseEndsAt`]: null,
  })
}

// Encryptor submits the three clues for their team this round.
export async function submitCipherClues(code, round, team, clues) {
  await set(
    ref(db, `rooms/${code}/cipher/rounds/${round}/clues/${team}`),
    clues
  )
}

// Save a team's working guess (any team member can call; latest write wins).
// `own` is the team's guess of their own code; `opp` is their intercept attempt.
export async function updateCipherGuess(code, round, team, own, opp) {
  await update(
    ref(db, `rooms/${code}/cipher/rounds/${round}/guesses/${team}`),
    { own, opp, locked: false }
  )
}

// Lock a team's guess — host loop advances once both teams are locked.
export async function lockCipherGuess(code, round, team) {
  await update(
    ref(db, `rooms/${code}/cipher/rounds/${round}/guesses/${team}`),
    { locked: true }
  )
}

// Status-only flip when both teams have submitted clues — opens guessing.
export async function startCipherGuessing(code) {
  await update(ref(db, `rooms/${code}/meta`), {
    status: 'cipher-guessing',
    phaseEndsAt: null,
  })
}

// Write a round's evaluated result + new team token totals; switch to reveal.
export async function applyCipherResult(code, round, result, teamA, teamB) {
  await update(ref(db), {
    [`rooms/${code}/cipher/rounds/${round}/result`]: result,
    [`rooms/${code}/cipher/teamA/intercepts`]: teamA.intercepts,
    [`rooms/${code}/cipher/teamA/miscoms`]: teamA.miscoms,
    [`rooms/${code}/cipher/teamB/intercepts`]: teamB.intercepts,
    [`rooms/${code}/cipher/teamB/miscoms`]: teamB.miscoms,
    [`rooms/${code}/meta/status`]: 'cipher-reveal',
    [`rooms/${code}/meta/phaseEndsAt`]: Date.now() + CIPHER_REVEAL_MS,
  })
}

// Game over.
export async function endCipherGame(code, winner) {
  await update(ref(db), {
    [`rooms/${code}/cipher/winner`]: winner,
    [`rooms/${code}/meta/status`]: 'cipher-scoreboard',
    [`rooms/${code}/meta/phaseEndsAt`]: null,
  })
}

export function beginNextRound(code, round) {
  return beginRound(code, round)
}

// Reset the room back to the lobby with the same players (names + avatars
// preserved) and scores cleared, ready for a new game with the existing group.
// Wipes rounds, tiebreaker, and the prompt shuffle so the next start draws fresh.
export async function playAgain(code) {
  const snap = await get(ref(db, `rooms/${code}/players`))
  const players = snap.val() || {}
  const updates = {
    [`rooms/${code}/meta/status`]: 'lobby',
    [`rooms/${code}/meta/round`]: 0,
    [`rooms/${code}/meta/voteIndex`]: null,
    [`rooms/${code}/meta/judgeIndex`]: null,
    [`rooms/${code}/meta/phaseEndsAt`]: null,
    [`rooms/${code}/meta/promptOrder`]: null,
    [`rooms/${code}/rounds`]: null,
    [`rooms/${code}/round3`]: null,
    [`rooms/${code}/tiebreaker`]: null,
    [`rooms/${code}/finalStandings`]: null,
    [`rooms/${code}/cipher`]: null,
  }
  Object.keys(players).forEach((uid) => {
    updates[`rooms/${code}/players/${uid}/score`] = 0
  })
  await update(ref(db), updates)
}

// ---- Phase transitions (host) ----------------------------------------------

// Open a matchup for voting in its locked read window. phaseEndsAt is left null
// on purpose — the actual vote clock only starts once the read window (and any
// intervention claimed during it) clears, written by startVoteClock from the
// host loop. See isVotingLocked.
export async function startVoting(code, voteIndex, lockMs) {
  await update(ref(db, `rooms/${code}/meta`), {
    status: 'voting',
    voteIndex,
    voteLockEndsAt: Date.now() + lockMs,
    phaseEndsAt: null,
  })
}

// Start the VOTE_MS countdown the moment the read/intervention lock lifts, so a
// matchup that was held open for an intervention still gets the full voting time.
export async function startVoteClock(code, durationMs) {
  await update(ref(db, `rooms/${code}/meta`), {
    phaseEndsAt: Date.now() + durationMs,
  })
}

export async function showResults(code, durationMs) {
  await update(ref(db, `rooms/${code}/meta`), {
    status: 'results',
    phaseEndsAt: Date.now() + durationMs,
  })
}

// ---- Tie-breaker (host) ----------------------------------------------------
// Triggered only when the final round ends with exactly two players tied for
// the top score. Stored at rooms/{code}/tiebreaker with the same shape as a
// matchup (authors/answers/votes), but lives outside the rounds tree so it
// doesn't disturb the regular round flow. authors[0] and authors[1] are the
// tied players. Non-authors vote; vote winner gets +1 score to break the tie.

export async function startTiebreaker(code, scores, authors) {
  // Enter the tie-breaker through the standings splash, not straight into the
  // prompt — gives everyone a beat to see who tied before the roast battle.
  const updates = {
    [`rooms/${code}/tiebreaker`]: { authors },
    [`rooms/${code}/meta/status`]: 'tiebreaker-scores',
    [`rooms/${code}/meta/phaseEndsAt`]: Date.now() + TIEBREAKER_SCORES_MS,
  }
  Object.entries(scores).forEach(([uid, score]) => {
    updates[`rooms/${code}/players/${uid}/score`] = score
  })
  await update(ref(db), updates)
}

export async function showTiebreakerVersus(code, durationMs) {
  await update(ref(db, `rooms/${code}/meta`), {
    status: 'tiebreaker-versus',
    phaseEndsAt: Date.now() + durationMs,
  })
}

export async function startTiebreakerAnswering(code, durationMs) {
  await update(ref(db, `rooms/${code}/meta`), {
    status: 'tiebreaker-answering',
    phaseEndsAt: Date.now() + durationMs,
  })
}

export async function startTiebreakerVoting(code, durationMs) {
  await update(ref(db, `rooms/${code}/meta`), {
    status: 'tiebreaker-voting',
    phaseEndsAt: Date.now() + durationMs,
  })
}

export async function showTiebreakerResults(code, durationMs) {
  await update(ref(db, `rooms/${code}/meta`), {
    status: 'tiebreaker-results',
    phaseEndsAt: Date.now() + durationMs,
  })
}

export async function submitTiebreakerAnswer(code, uid, text) {
  await set(ref(db, `rooms/${code}/tiebreaker/answers/${uid}`), text)
}

export async function submitTiebreakerVote(code, voterUid, authorUid) {
  await set(ref(db, `rooms/${code}/tiebreaker/votes/${voterUid}`), authorUid)
}

// `finalStandings` (optional, only passed at game-end) is a frozen snapshot of
// [{ uid, name, avatar, score }] used so the final scoreboard's displayed
// winner doesn't shift if someone leaves the room afterwards.
export async function applyScores(code, scores, finalStandings) {
  const updates = {
    [`rooms/${code}/meta/status`]: 'scoreboard',
    [`rooms/${code}/meta/phaseEndsAt`]: null,
  }
  Object.entries(scores).forEach(([uid, score]) => {
    updates[`rooms/${code}/players/${uid}/score`] = score
  })
  if (finalStandings) {
    updates[`rooms/${code}/finalStandings`] = finalStandings
  }
  await update(ref(db), updates)
}

// ---- Player actions --------------------------------------------------------

export async function submitAnswer(code, round, matchupId, uid, text) {
  await set(
    ref(db, `rooms/${code}/rounds/${round}/matchups/${matchupId}/answers/${uid}`),
    text
  )
}

export async function submitVote(code, round, matchupId, voterUid, authorUid) {
  await set(
    ref(db, `rooms/${code}/rounds/${round}/matchups/${matchupId}/votes/${voterUid}`),
    authorUid
  )
}

// ---- Experimental wagers (betting + intervention) --------------------------

// Back your own answer with an even-money bet, written alongside the answer and
// hidden (UI-side) until results. Stored under the matchup so it travels with it.
export async function placeBet(code, round, matchupId, uid, stake) {
  await set(
    ref(db, `rooms/${code}/rounds/${round}/matchups/${matchupId}/bets/${uid}`),
    stake
  )
}

// Reserve the (single) intervention slot the instant a player hits "step in",
// before they've typed anything. The host keeps voting locked for everyone while
// this claim is live, so no vote can land before the intervention is submitted.
// Transaction = first claimer wins; a simultaneous challenger is rejected.
export async function claimIntervention(code, round, matchupId, uid) {
  const claimRef = ref(
    db,
    `rooms/${code}/rounds/${round}/matchups/${matchupId}/interventionClaim`
  )
  const res = await runTransaction(claimRef, (cur) => {
    if (cur) return undefined // someone's already stepping in — abort
    return { uid, at: Date.now() }
  })
  if (!res.committed) {
    throw new Error('Someone is already stepping in on this one')
  }
}

// Drop a claim if the player backs out — releases the voting lock for everyone.
// Only removes the claim when it's actually theirs (no-op otherwise).
export async function releaseIntervention(code, round, matchupId, uid) {
  const claimRef = ref(
    db,
    `rooms/${code}/rounds/${round}/matchups/${matchupId}/interventionClaim`
  )
  await runTransaction(claimRef, (cur) => {
    if (cur && cur.uid === uid) return null // remove my claim
    return undefined // not mine (or already gone) — leave it untouched
  })
}

// Step into a flopped matchup with a third answer + stake. There's exactly one
// slot per matchup, so this runs as a transaction: the first writer wins and any
// simultaneous challenger is rejected.
export async function intervene(code, round, matchupId, uid, text, stake) {
  const ivRef = ref(
    db,
    `rooms/${code}/rounds/${round}/matchups/${matchupId}/intervention`
  )
  const res = await runTransaction(ivRef, (cur) => {
    if (cur) return undefined // slot already taken — abort
    return { uid, answer: text, stake }
  })
  if (!res.committed) {
    throw new Error('Someone already stepped in on this one')
  }
}

// ---- Round 3: "Author's Cut" -----------------------------------------------

export async function startRound3Prompts(code, durationMs) {
  await update(ref(db, `rooms/${code}/meta`), {
    status: 'round3-prompts',
    phaseEndsAt: Date.now() + durationMs,
  })
}

// All players submitted their prompt — compute the assignment and open the
// answering phase. The items list is written here so all clients see the same
// shuffled order.
export async function startRound3Answering(code, durationMs) {
  const snap = await get(ref(db, `rooms/${code}/round3/prompts`))
  const items = buildRound3Items(snap.val() || {})
  await update(ref(db), {
    [`rooms/${code}/round3/items`]: items,
    [`rooms/${code}/meta/status`]: 'round3-answering',
    [`rooms/${code}/meta/phaseEndsAt`]: Date.now() + durationMs,
  })
}

// Open (or advance) the judging phase for one specific prompt. Round 3 runs
// sequentially: judging[i] → results[i] → judging[i+1] → … so every player
// reads the same prompt together while the author picks live.
export async function startRound3Judging(code, judgeIndex, durationMs) {
  await update(ref(db, `rooms/${code}/meta`), {
    status: 'round3-judging',
    judgeIndex,
    phaseEndsAt: Date.now() + durationMs,
  })
}

// Begin (or advance) the sequential reveal — each prompt's results in turn.
export async function showRound3Reveal(code, judgeIndex, durationMs) {
  await update(ref(db, `rooms/${code}/meta`), {
    status: 'round3-results',
    judgeIndex,
    phaseEndsAt: Date.now() + durationMs,
  })
}

export async function submitRound3Prompt(code, uid, text) {
  await set(ref(db, `rooms/${code}/round3/prompts/${uid}/text`), text)
}

export async function submitRound3Answer(code, itemIndex, uid, text) {
  await set(
    ref(db, `rooms/${code}/round3/items/${itemIndex}/answers/${uid}`),
    text
  )
}

export async function submitRound3Choice(code, itemIndex, chosenUid) {
  await set(
    ref(db, `rooms/${code}/round3/items/${itemIndex}/chosen`),
    chosenUid
  )
}

// Pick a random answerer for a single item — fires when its author runs out
// the per-prompt judging timer, so the answerers aren't punished for a flaky
// judge.
export async function autopickRound3(code, items, index) {
  const it = items?.[index]
  if (!it || it.chosen != null) return
  const answerers = Object.keys(it.answers || {})
  if (answerers.length === 0) return
  const pick = answerers[Math.floor(Math.random() * answerers.length)]
  await set(ref(db, `rooms/${code}/round3/items/${index}/chosen`), pick)
}
