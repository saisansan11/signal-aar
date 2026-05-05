import {
  collection, addDoc, query, where, onSnapshot, serverTimestamp,
} from 'firebase/firestore'
import { db, USE_MOCK } from './firebase'
import { MOCK_RESPONSES } from './mockData'
import type { Response } from '../models'
import { newId } from '../utils/id'
import { nowIso } from '../utils/dateFormat'

export async function submitResponse(data: Omit<Response, 'responseId' | 'createdAt'>): Promise<Response> {
  const r: Response = { ...data, responseId: newId('r'), createdAt: nowIso() }
  if (!USE_MOCK) {
    const { responseId: _responseId, ...payload } = r
    const ref = await addDoc(collection(db!, 'responses'), { ...payload, createdAt: serverTimestamp() })
    return { ...r, responseId: ref.id }
  }
  MOCK_RESPONSES.push(r)
  return r
}

export async function getResponsesByQuestion(sessionId: string, questionId: string): Promise<Response[]> {
  if (USE_MOCK) return MOCK_RESPONSES.filter(r => r.sessionId === sessionId && r.questionId === questionId)
  const q = query(collection(db!, 'responses'), where('sessionId', '==', sessionId), where('questionId', '==', questionId))
  const snap = await (await import('firebase/firestore')).getDocs(q)
  return snap.docs.map(d => ({ ...d.data(), responseId: d.id } as Response))
}

export function subscribeToResponses(sessionId: string, questionId: string, cb: (rs: Response[]) => void): () => void {
  if (USE_MOCK) {
    cb(MOCK_RESPONSES.filter(r => r.sessionId === sessionId && r.questionId === questionId))
    return () => {}
  }
  const q = query(collection(db!, 'responses'), where('sessionId', '==', sessionId), where('questionId', '==', questionId))
  return onSnapshot(q, snap => {
    cb(snap.docs.map(d => ({ ...d.data(), responseId: d.id } as Response)))
  })
}

export function subscribeToAllSessionResponses(sessionId: string, cb: (rs: Response[]) => void): () => void {
  if (USE_MOCK) {
    cb(MOCK_RESPONSES.filter(r => r.sessionId === sessionId))
    return () => {}
  }
  const q = query(collection(db!, 'responses'), where('sessionId', '==', sessionId))
  return onSnapshot(q, snap => {
    cb(snap.docs.map(d => ({ ...d.data(), responseId: d.id } as Response)))
  })
}
