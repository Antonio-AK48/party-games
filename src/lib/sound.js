// Tiny synthesized sound bank. We don't ship audio files — every cue is built
// from oscillators + noise via Web Audio API, so this adds zero asset weight.
// Every play() is fire-and-forget and degrades silently when audio isn't
// available (no user gesture yet, suspended context, headless test, etc).

const MUTED_KEY = 'pg.muted'

let ctx = null
let muted = loadMuted()

function loadMuted() {
  try {
    return localStorage.getItem(MUTED_KEY) === '1'
  } catch {
    return false
  }
}

function getCtx() {
  if (ctx) return ctx
  try {
    const Ctor = window.AudioContext || window.webkitAudioContext
    if (!Ctor) return null
    ctx = new Ctor()
  } catch {
    return null
  }
  return ctx
}

// Ensure the context is running. Browsers start it suspended until a user
// gesture; calling resume() inside a click-handler chain unlocks it.
function ensureRunning(c) {
  if (c && c.state === 'suspended' && typeof c.resume === 'function') {
    c.resume().catch(() => {})
  }
}

// ---- Primitive building blocks ---------------------------------------------

// Single tone with a quick attack and exponential decay. `start` is an offset
// in seconds from "now," used to chain notes into chimes/arpeggios.
function tone({ freq, dur = 0.12, type = 'sine', gain = 0.2, attack = 0.005, start = 0 }) {
  const c = getCtx()
  if (!c || muted) return
  ensureRunning(c)
  const t0 = c.currentTime + start
  const osc = c.createOscillator()
  const g = c.createGain()
  osc.type = type
  osc.frequency.setValueAtTime(freq, t0)
  g.gain.setValueAtTime(0.0001, t0)
  g.gain.exponentialRampToValueAtTime(gain, t0 + attack)
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur)
  osc.connect(g).connect(c.destination)
  osc.start(t0)
  osc.stop(t0 + dur + 0.02)
}

// Pitch sweep — useful for "swoop" stings (intervention etc).
function sweep({ from, to, dur = 0.35, type = 'sawtooth', gain = 0.18, start = 0 }) {
  const c = getCtx()
  if (!c || muted) return
  ensureRunning(c)
  const t0 = c.currentTime + start
  const osc = c.createOscillator()
  const g = c.createGain()
  osc.type = type
  osc.frequency.setValueAtTime(from, t0)
  osc.frequency.exponentialRampToValueAtTime(to, t0 + dur)
  g.gain.setValueAtTime(0.0001, t0)
  g.gain.exponentialRampToValueAtTime(gain, t0 + 0.02)
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur)
  osc.connect(g).connect(c.destination)
  osc.start(t0)
  osc.stop(t0 + dur + 0.02)
}

// Short noise burst, low-pass shaped — used as a drumroll under reveals.
function noise({ dur = 0.4, gain = 0.04, start = 0 }) {
  const c = getCtx()
  if (!c || muted) return
  ensureRunning(c)
  const t0 = c.currentTime + start
  const frames = Math.floor(c.sampleRate * dur)
  const buf = c.createBuffer(1, frames, c.sampleRate)
  const data = buf.getChannelData(0)
  for (let i = 0; i < frames; i++) data[i] = Math.random() * 2 - 1
  const src = c.createBufferSource()
  src.buffer = buf
  const filt = c.createBiquadFilter()
  filt.type = 'lowpass'
  filt.frequency.value = 1200
  const g = c.createGain()
  g.gain.setValueAtTime(0.0001, t0)
  g.gain.exponentialRampToValueAtTime(gain, t0 + 0.02)
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur)
  src.connect(filt).connect(g).connect(c.destination)
  src.start(t0)
  src.stop(t0 + dur + 0.02)
}

// ---- Cues ------------------------------------------------------------------
// Sparingly used: only the moments the game wants to punctuate.

export const sounds = {
  // A locked-in two-note chime when an answer is submitted.
  submit() {
    tone({ freq: 783.99, dur: 0.14, type: 'triangle', gain: 0.18 })
    tone({ freq: 1046.5, dur: 0.22, type: 'triangle', gain: 0.18, start: 0.09 })
  },
  // Crisp tap when a vote is cast.
  vote() {
    tone({ freq: 1200, dur: 0.05, type: 'square', gain: 0.08 })
  },
  // Dramatic swoop when someone steps in with an intervention.
  intervention() {
    sweep({ from: 220, to: 1500, dur: 0.32, type: 'sawtooth', gain: 0.16 })
    tone({ freq: 1500, dur: 0.18, type: 'triangle', gain: 0.18, start: 0.3 })
  },
  // Drumroll into a ding when a matchup's results land.
  reveal() {
    noise({ dur: 0.45, gain: 0.05 })
    tone({ freq: 880, dur: 0.28, type: 'triangle', gain: 0.22, start: 0.42 })
  },
  // Ascending arpeggio for the final-round winner.
  winner() {
    const notes = [523.25, 659.25, 783.99, 1046.5] // C5 E5 G5 C6
    notes.forEach((f, i) =>
      tone({ freq: f, dur: 0.28, type: 'triangle', gain: 0.22, start: i * 0.12 })
    )
  },
  // Soft clock-tick for the last few seconds of any timer.
  tick() {
    tone({ freq: 660, dur: 0.04, type: 'square', gain: 0.05 })
  },
}

// ---- Mute control ----------------------------------------------------------

export function isMuted() {
  return muted
}

export function setMuted(v) {
  muted = !!v
  try {
    localStorage.setItem(MUTED_KEY, muted ? '1' : '0')
  } catch {
    // localStorage unavailable — runtime state still flips, just won't persist
  }
  if (!muted) ensureRunning(getCtx())
}

export function toggleMuted() {
  setMuted(!muted)
  return muted
}
