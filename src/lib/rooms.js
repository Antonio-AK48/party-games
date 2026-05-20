import {
  ref,
  get,
  set,
  update,
  onValue,
  remove,
  serverTimestamp,
} from 'firebase/database'
import { db, ensureAuth } from './firebase'
import { buildMatchups, ANSWER_MS } from './game'

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

export async function createRoom(name) {
  const uid = await ensureAuth()
  const code = await freshCode()
  await set(ref(db, `rooms/${code}`), {
    meta: {
      status: 'lobby',
      hostId: uid,
      round: 0,
      createdAt: serverTimestamp(),
    },
    players: {
      [uid]: { name, score: 0, isHost: true, joinedAt: serverTimestamp() },
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
    await update(ref(db, `rooms/${code}/players/${uid}`), { name })
  } else {
    await update(ref(db, `rooms/${code}/players/${uid}`), {
      name,
      score: 0,
      isHost: false,
      joinedAt: serverTimestamp(),
    })
  }
  return { code, uid }
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

// Build a round's matchups and open the answering phase, atomically.
async function beginRound(code, round) {
  const players = await playersOrdered(code)
  const matchups = buildMatchups(players, round)
  await update(ref(db), {
    [`rooms/${code}/rounds/${round}/matchups`]: matchups,
    [`rooms/${code}/meta/status`]: 'answering',
    [`rooms/${code}/meta/round`]: round,
    [`rooms/${code}/meta/voteIndex`]: 0,
    [`rooms/${code}/meta/phaseEndsAt`]: Date.now() + ANSWER_MS,
  })
}

export function startGame(code) {
  return beginRound(code, 1)
}

export function beginNextRound(code, round) {
  return beginRound(code, round)
}

// ---- Phase transitions (host) ----------------------------------------------

export async function startVoting(code, voteIndex, durationMs) {
  await update(ref(db, `rooms/${code}/meta`), {
    status: 'voting',
    voteIndex,
    phaseEndsAt: Date.now() + durationMs,
  })
}

export async function showResults(code, durationMs) {
  await update(ref(db, `rooms/${code}/meta`), {
    status: 'results',
    phaseEndsAt: Date.now() + durationMs,
  })
}

export async function applyScores(code, scores) {
  const updates = {
    [`rooms/${code}/meta/status`]: 'scoreboard',
    [`rooms/${code}/meta/phaseEndsAt`]: null,
  }
  Object.entries(scores).forEach(([uid, score]) => {
    updates[`rooms/${code}/players/${uid}/score`] = score
  })
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
