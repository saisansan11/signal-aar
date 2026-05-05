import { collection, getDocs, addDoc, query, where, serverTimestamp } from 'firebase/firestore'
import { db, USE_MOCK } from './firebase'
import { MOCK_BATCHES } from './mockData'
import type { Batch } from '../models'
import { newId } from '../utils/id'

export async function getBatchesByCourse(courseId: string): Promise<Batch[]> {
  if (USE_MOCK) return MOCK_BATCHES.filter(b => b.courseId === courseId)
  const q = query(collection(db!, 'batches'), where('courseId', '==', courseId))
  const snap = await getDocs(q)
  return snap.docs.map(d => ({ ...d.data(), batchId: d.id } as Batch))
}

export async function getAllBatches(): Promise<Batch[]> {
  if (USE_MOCK) return MOCK_BATCHES
  const snap = await getDocs(collection(db!, 'batches'))
  return snap.docs.map(d => ({ ...d.data(), batchId: d.id } as Batch))
}

export async function createBatch(data: Omit<Batch, 'batchId'>): Promise<Batch> {
  const batch: Batch = { ...data, batchId: newId('b') }
  if (!USE_MOCK) {
    const ref = await addDoc(collection(db!, 'batches'), { ...data, createdAt: serverTimestamp() })
    return { ...batch, batchId: ref.id }
  }
  MOCK_BATCHES.push(batch)
  return batch
}
