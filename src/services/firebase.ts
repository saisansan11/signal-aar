import { initializeApp } from 'firebase/app'
import { getFirestore } from 'firebase/firestore'
import { getAuth } from 'firebase/auth'

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY ?? '',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN ?? '',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID ?? '',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET ?? '',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID ?? '',
  appId: import.meta.env.VITE_FIREBASE_APP_ID ?? '',
}

export const USE_MOCK = !firebaseConfig.projectId

let db: ReturnType<typeof getFirestore> | null = null
let auth: ReturnType<typeof getAuth> | null = null

if (!USE_MOCK) {
  const app = initializeApp(firebaseConfig)
  db = getFirestore(app)
  auth = getAuth(app)
}

export { db, auth }
