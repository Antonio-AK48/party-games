import { initializeApp } from 'firebase/app'
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth'
import { getDatabase } from 'firebase/database'

// Web config values come from .env.local (see .env.example). The apiKey here is
// a public client identifier, not a secret — access is gated by database rules.
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
}

// True once the two values we can't run without are present.
export const isConfigured = Boolean(
  firebaseConfig.apiKey && firebaseConfig.databaseURL
)

// Guard against a misconfigured deploy (missing env vars). Without this,
// getDatabase() throws at import time and the whole app renders a blank white
// page before <SetupNotice> can explain what's wrong. When unconfigured these
// stay null and App renders the setup notice instead.
const app = isConfigured ? initializeApp(firebaseConfig) : null
export const db = app ? getDatabase(app) : null
export const auth = app ? getAuth(app) : null

// Sign in anonymously exactly once and cache the promise. Every room operation
// awaits this so we always have a stable uid to key players/answers/votes by.
// Anonymous sessions persist across refreshes, so a reload keeps the same uid.
let authPromise = null
export function ensureAuth() {
  if (!authPromise) {
    authPromise = new Promise((resolve, reject) => {
      const unsub = onAuthStateChanged(auth, (user) => {
        if (user) {
          unsub()
          resolve(user.uid)
        }
      })
      signInAnonymously(auth).catch((err) => {
        unsub()
        reject(err)
      })
    })
  }
  return authPromise
}
