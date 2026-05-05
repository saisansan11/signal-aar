import {
  collection, query, where, onSnapshot, serverTimestamp,
  doc, setDoc, getDoc, FirestoreError,
} from 'firebase/firestore'
import { db, USE_MOCK } from './firebase'
import { MOCK_RESPONSES } from './mockData'
import type { Response } from '../models'
import { nowIso } from '../utils/dateFormat'

/**
 * Deterministic responseId prevents duplicate submissions.
 * Same student answering the same question always maps to the same Firestore doc.
 */
export function makeResponseId(sessionId: string, questionId: string, alias: string): string {
  // sanitise alias → safe Firestore doc id
  const safeAlias = alias.replace(/[^a-zA-Z0-9ก-ฺเ-๛]/g, '_').slice(0, 40)
  return `${sessionId}__${questionId}__${safeAlias}`
}

export async function submitResponse(
  data: Omit<Response, 'responseId' | 'createdAt'>,
): Promise<{ response: Response; isDuplicate: boolean }> {
  const responseId = makeResponseId(data.sessionId, data.questionId, data.studentAlias)
  const r: Response = { ...data, responseId, createdAt: nowIso() }

  if (USE_MOCK) {
    const existing = MOCK_RESPONSES.findIndex(x => x.responseId === responseId)
    if (existing >= 0) {
      return { response: MOCK_RESPONSES[existing], isDuplicate: true }
    }
    MOCK_RESPONSES.push(r)
    return { response: r, isDuplicate: false }
  }

  // setDoc with merge:false → idempotent; won't overwrite if already exists
  const ref = doc(collection(db!, 'responses'), responseId)
  const snap = await getDoc(ref)
  if (snap.exists()) {
    return { response: { ...snap.data(), responseId: snap.id } as Response, isDuplicate: true }
  }
  const { responseId: _id, ...payload } = r
  await setDoc(ref, { ...payload, createdAt: serverTimestamp() })
  return { response: r, isDuplicate: false }
}

export async function getResponsesByQuestion(sessionId: string, questionId: string): Promise<Response[]> {
  if (USE_MOCK) {
    return MOCK_RESPONSES.filter(r => r.sessionId === sessionId && r.questionId === questionId)
  }
  const { getDocs } = await import('firebase/firestore')
  const q = query(
    collection(db!, 'responses'),
    where('sessionId', '==', sessionId),
    where('questionId', '==', questionId),
  )
  const snap = await getDocs(q)
  return snap.docs.map(d => ({ ...d.data(), responseId: d.id } as Response))
}

export interface ListenerOptions {
  onError?: (err: FirestoreError) => void
}

export function subscribeToResponses(
  sessionId: string,
  questionId: string,
  cb: (rs: Response[]) => void,
  opts: ListenerOptions = {},
): () => void {
  if (USE_MOCK) {
    cb(MOCK_RESPONSES.filter(r => r.sessionId === sessionId && r.questionId === questionId))
    return () => {}
  }
  const q = query(
    collection(db!, 'responses'),
    where('sessionId', '==', sessionId),
    where('questionId', '==', questionId),
  )
  return onSnapshot(
    q,
    snap => cb(snap.docs.map(d => ({ ...d.data(), responseId: d.id } as Response))),
    err => {
      console.error('[subscribeToResponses]', err)
      opts.onError?.(err)
    },
  )
}

export function subscribeToAllSessionResponses(
  sessionId: string,
  cb: (rs: Response[]) => void,
  opts: ListenerOptions = {},
): () => void {
  if (USE_MOCK) {
    cb(MOCK_RESPONSES.filter(r => r.sessionId === sessionId))
    return () => {}
  }
  const q = query(collection(db!, 'responses'), where('sessionId', '==', sessionId))
  return onSnapshot(
    q,
    snap => cb(snap.docs.map(d => ({ ...d.data(), responseId: d.id } as Response))),
    err => {
      console.error('[subscribeToAllSessionResponses]', err)
      opts.onError?.(err)
    },
  )
}
