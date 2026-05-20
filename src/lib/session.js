// Remembers which room this browser is in, so a refresh or accidental tab close
// can drop the player straight back into the game instead of the home screen.
// Anonymous auth already persists the uid; we only need to remember the code.
const KEY = 'pg:session'

export function saveSession(code) {
  try {
    localStorage.setItem(KEY, JSON.stringify({ code }))
  } catch {
    // private mode / storage disabled — reconnect just won't be available
  }
}

export function loadSession() {
  try {
    return JSON.parse(localStorage.getItem(KEY) || 'null')
  } catch {
    return null
  }
}

export function clearSession() {
  try {
    localStorage.removeItem(KEY)
  } catch {
    // ignore
  }
}
