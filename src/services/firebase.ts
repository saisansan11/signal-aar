import { initializeApp, type FirebaseApp } from 'firebase/app'
import { getFirestore, type Firestore } from 'firebase/firestore'
import { getAuth, type Auth } from 'firebase/auth'

const cfg = {
  apiKey:            import.meta.env.VITE_FIREBASE_API_KEY            as string | undefined,
  authDomain:        import.meta.env.VITE_FIREBASE_AUTH_DOMAIN        as string | undefined,
  projectId:         import.meta.env.VITE_FIREBASE_PROJECT_ID         as string | undefined,
  storageBucket:     import.meta.env.VITE_FIREBASE_STORAGE_BUCKET     as string | undefined,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID as string | undefined,
  appId:             import.meta.env.VITE_FIREBASE_APP_ID             as string | undefined,
}

// USE_MOCK = true when apiKey OR projectId is missing/empty
export const USE_MOCK = !cfg.apiKey?.trim() || !cfg.projectId?.trim()

let _app:  FirebaseApp | null = null
let _db:   Firestore   | null = null
let _auth: Auth        | null = null

if (!USE_MOCK) {
  _app  = initializeApp(cfg as Required<typeof cfg>)
  _db   = getFirestore(_app)
  _auth = getAuth(_app)
  console.info(`[Firebase] 🔥 Connected — project: ${cfg.projectId}`)
} else {
  console.info('[Firebase] 🟡 MOCK mode — add .env to use Firestore')
}

export const firebaseApp = _app
export const db          = _db
export const auth        = _auth
