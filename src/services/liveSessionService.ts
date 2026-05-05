import {
  collection, getDocs, addDoc, updateDoc, doc, query,
  where, onSnapshot, serverTimestamp, getDoc,
} from 'firebase/firestore'
import { db, USE_MOCK } from './firebase'
import { MOCK_SESSIONS } from './mockData'
import type { LiveSession, SessionStatus } from '../models'
import { newId } from '../utils/id'
import { nowIso } from '../utils/dateFormat'
import { generateJoinCode } from '../utils/joinCode'

export async function getAllSessions(): Promise<LiveSession[]> {
  if (USE_MOCK) return [...MOCK_SESSIONS]
  const snap = await getDocs(collection(db!, 'liveSessions'))
  return snap.docs.map(d => ({ sessionId: d.id, ...d.data() } as LiveSession))
}

export async function getSessionByCode(code: string): Promise<LiveSession | null> {
  if (USE_MOCK) return MOCK_SESSIONS.find(s => s.joinCode === code.toUpperCase()) ?? null
  const q = query(collection(db!, 'liveSessions'), where('joinCode', '==', code.toUpperCase()), where('status', '==', 'active'))
  const snap = await getDocs(q)
  if (snap.empty) return null
  const d = snap.docs[0]
  return { sessionId: d.id, ...d.data() } as LiveSession
}

export async function getSessionById(sessionId: string): Promise<LiveSession | null> {
  if (USE_MOCK) return MOCK_SESSIONS.find(s => s.sessionId === sessionId) ?? null
  const ref = doc(db!, 'liveSessions', sessionId)
  const snap = await getDoc(ref)
  if (!snap.exists()) return null
  return { sessionId: snap.id, ...snap.data() } as LiveSession
}

export async function createSession(data: Omit<LiveSession, 'sessionId' | 'joinCode' | 'createdAt' | 'closedAt' | 'status' | 'currentQuestionId'>): Promise<LiveSession> {
  const session: LiveSession = {
    ...data,
    sessionId: newId('s'),
    joinCode: generateJoinCode(),
    status: 'draft',
    currentQuestionId: null,
    createdAt: nowIso(),
    closedAt: null,
  }
  if (!USE_MOCK) {
    const ref = await addDoc(collection(db!, 'liveSessions'), { ...session, createdAt: serverTimestamp() })
    return { ...session, sessionId: ref.id }
  }
  MOCK_SESSIONS.push(session)
  return session
}

export async function updateSessionStatus(sessionId: string, status: SessionStatus, currentQuestionId?: string | null): Promise<void> {
  const update: Partial<LiveSession> = { status }
  if (currentQuestionId !== undefined) update.currentQuestionId = currentQuestionId
  if (status === 'closed') update.closedAt = nowIso()

  if (USE_MOCK) {
    const idx = MOCK_SESSIONS.findIndex(s => s.sessionId === sessionId)
    if (idx >= 0) Object.assign(MOCK_SESSIONS[idx], update)
    return
  }
  await updateDoc(doc(db!, 'liveSessions', sessionId), update)
}

export function subscribeToSession(sessionId: string, cb: (s: LiveSession | null) => void): () => void {
  if (USE_MOCK) {
    cb(MOCK_SESSIONS.find(s => s.sessionId === sessionId) ?? null)
    return () => {}
  }
  return onSnapshot(doc(db!, 'liveSessions', sessionId), snap => {
    cb(snap.exists() ? { sessionId: snap.id, ...snap.data() } as LiveSession : null)
  })
}
