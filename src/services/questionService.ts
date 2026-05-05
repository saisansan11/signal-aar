import {
  collection, getDocs, addDoc, updateDoc, doc,
  query, where, onSnapshot, serverTimestamp, FirestoreError,
} from 'firebase/firestore'
import { db, USE_MOCK } from './firebase'
import { MOCK_QUESTIONS } from './mockData'
import type { Question } from '../models'
import { newId } from '../utils/id'
import { nowIso } from '../utils/dateFormat'

export interface ListenerOptions {
  onError?: (err: FirestoreError) => void
}

export async function getQuestionsBySession(sessionId: string): Promise<Question[]> {
  if (USE_MOCK) return MOCK_QUESTIONS.filter(q => q.sessionId === sessionId).sort((a, b) => a.order - b.order)
  const q = query(collection(db!, 'questions'), where('sessionId', '==', sessionId))
  const snap = await getDocs(q)
  return snap.docs
    .map(d => ({ ...d.data(), questionId: d.id } as Question))
    .sort((a, b) => a.order - b.order)
}

export async function addQuestion(data: Omit<Question, 'questionId' | 'createdAt'>): Promise<Question> {
  const q: Question = { ...data, questionId: newId('q'), createdAt: nowIso() }
  if (!USE_MOCK) {
    const { questionId: _id, ...payload } = q
    const ref = await addDoc(collection(db!, 'questions'), { ...payload, createdAt: serverTimestamp() })
    return { ...q, questionId: ref.id }
  }
  MOCK_QUESTIONS.push(q)
  return q
}

export async function setActiveQuestion(questionId: string, isActive: boolean): Promise<void> {
  if (USE_MOCK) {
    const q = MOCK_QUESTIONS.find(x => x.questionId === questionId)
    if (q) q.isActive = isActive
    return
  }
  await updateDoc(doc(db!, 'questions', questionId), { isActive })
}

export function subscribeToQuestions(
  sessionId: string,
  cb: (qs: Question[]) => void,
  opts: ListenerOptions = {},
): () => void {
  if (USE_MOCK) {
    cb(MOCK_QUESTIONS.filter(q => q.sessionId === sessionId).sort((a, b) => a.order - b.order))
    return () => {}
  }
  const q = query(collection(db!, 'questions'), where('sessionId', '==', sessionId))
  return onSnapshot(
    q,
    snap => {
      cb(snap.docs
        .map(d => ({ ...d.data(), questionId: d.id } as Question))
        .sort((a, b) => a.order - b.order))
    },
    err => {
      console.error('[subscribeToQuestions]', err)
      opts.onError?.(err)
    },
  )
}
