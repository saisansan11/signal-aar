/**
 * seedService — seeds demo data into Firestore.
 * Safe: checks before writing (deterministic IDs), never duplicates.
 * In MOCK mode: mutates the in-memory mock arrays instead.
 */
import {
  collection, doc, getDoc, setDoc, serverTimestamp,
} from 'firebase/firestore'
import { db, USE_MOCK } from './firebase'
import {
  MOCK_COURSES, MOCK_BATCHES, MOCK_SESSIONS, MOCK_QUESTIONS,
} from './mockData'
import type { Course, Batch, LiveSession, Question } from '../models'

// Deterministic IDs so re-seeding is idempotent
const SEED_COURSE_ID  = 'demo-ecm-c1'
const SEED_BATCH_ID   = 'demo-batch-14'
const SEED_SESSION_ID = 'demo-session-live'

const DEMO_COURSE: Course = {
  courseId:    SEED_COURSE_ID,
  name:        'ECM Burn-through & Jamming',
  description: 'หลักสูตรเทคนิค ECM และการรบกวนสัญญาณ — Demo',
  department:  'แผนกวิชาการสื่อสารประเภทวิทยุและการสงครามอิเล็กทรอนิกส์',
  createdAt:   new Date().toISOString(),
}

const DEMO_BATCH: Batch = {
  batchId:        SEED_BATCH_ID,
  courseId:       SEED_COURSE_ID,
  batchName:      'รุ่นที่ 14 (Demo)',
  startDate:      '2026-04-01',
  endDate:        '2026-04-30',
  instructorName: 'ร.อ. สมศักดิ์ มั่นคง',
}

const DEMO_SESSION: LiveSession = {
  sessionId:         SEED_SESSION_ID,
  courseId:          SEED_COURSE_ID,
  batchId:           SEED_BATCH_ID,
  title:             'AAR — ECM Burn-through สัปดาห์ที่ 2 (Demo)',
  status:            'active',
  currentQuestionId: 'demo-q1',
  joinCode:          'DEMO01',
  createdBy:         'seed-script',
  createdAt:         new Date().toISOString(),
  closedAt:          null,
}

const DEMO_QUESTIONS: Question[] = [
  {
    questionId: 'demo-q1',
    sessionId:  SEED_SESSION_ID,
    text:       'ท่านเข้าใจขั้นตอนการคำนวณ Burn-through Range มากน้อยเพียงใด?',
    type:       'rating',
    options:    [],
    order:      1,
    isActive:   true,
    createdAt:  new Date().toISOString(),
  },
  {
    questionId: 'demo-q2',
    sessionId:  SEED_SESSION_ID,
    text:       'อุปกรณ์ในการฝึกมีเพียงพอสำหรับการฝึกปฏิบัติ?',
    type:       'yesNo',
    options:    ['ใช่', 'ไม่ใช่'],
    order:      2,
    isActive:   false,
    createdAt:  new Date().toISOString(),
  },
  {
    questionId: 'demo-q3',
    sessionId:  SEED_SESSION_ID,
    text:       'ข้อใดต่อไปนี้ถูกต้องเกี่ยวกับ ECM Burn-through?',
    type:       'multipleChoice',
    options:    [
      'กำลังส่งสูง → ระยะ Burn-through ไกล',
      'ความถี่ต่ำ → Burn-through ดีกว่า',
      'J/S Ratio ยิ่งสูงยิ่งดีสำหรับฝ่ายเรา',
      'ไม่มีข้อถูก',
    ],
    order:      3,
    isActive:   false,
    createdAt:  new Date().toISOString(),
  },
  {
    questionId: 'demo-q4',
    sessionId:  SEED_SESSION_ID,
    text:       'ข้อเสนอแนะ / สิ่งที่อยากให้ปรับปรุงในการฝึกครั้งนี้',
    type:       'openText',
    options:    [],
    order:      4,
    isActive:   false,
    createdAt:  new Date().toISOString(),
  },
]

async function firestoreUpsert(colName: string, id: string, data: object): Promise<boolean> {
  if (!db) return false
  const ref  = doc(collection(db, colName), id)
  const snap = await getDoc(ref)
  if (snap.exists()) return false           // already seeded
  await setDoc(ref, { ...data, _seeded: true, createdAt: serverTimestamp() })
  return true
}

export async function seedDemoData(): Promise<{ created: string[]; skipped: string[] }> {
  const created: string[] = []
  const skipped: string[] = []

  if (USE_MOCK) {
    // ── MOCK MODE: mutate in-memory arrays ──────────────────────────
    const has = (arr: { courseId?: string; batchId?: string; sessionId?: string; questionId?: string }[], id: string) =>
      arr.some(x => Object.values(x).includes(id))

    if (!has(MOCK_COURSES, SEED_COURSE_ID))   { MOCK_COURSES.push(DEMO_COURSE);        created.push('course') }  else skipped.push('course')
    if (!has(MOCK_BATCHES, SEED_BATCH_ID))    { MOCK_BATCHES.push(DEMO_BATCH);         created.push('batch') }   else skipped.push('batch')
    if (!has(MOCK_SESSIONS, SEED_SESSION_ID)) { MOCK_SESSIONS.push(DEMO_SESSION);      created.push('session') } else skipped.push('session')
    DEMO_QUESTIONS.forEach(q => {
      if (!has(MOCK_QUESTIONS, q.questionId)) { MOCK_QUESTIONS.push(q); created.push(`q:${q.questionId}`) }
      else skipped.push(`q:${q.questionId}`)
    })
    console.info('[Seed] Mock seeded:', created, '| skipped:', skipped)
    return { created, skipped }
  }

  // ── FIREBASE MODE ─────────────────────────────────────────────────
  const didCourse  = await firestoreUpsert('courses',      SEED_COURSE_ID,  DEMO_COURSE)
  const didBatch   = await firestoreUpsert('batches',      SEED_BATCH_ID,   DEMO_BATCH)
  const didSession = await firestoreUpsert('liveSessions', SEED_SESSION_ID, DEMO_SESSION)
  if (didCourse)  created.push('course');  else skipped.push('course')
  if (didBatch)   created.push('batch');   else skipped.push('batch')
  if (didSession) created.push('session'); else skipped.push('session')

  for (const q of DEMO_QUESTIONS) {
    const did = await firestoreUpsert('questions', q.questionId, q)
    if (did) created.push(`q:${q.questionId}`); else skipped.push(`q:${q.questionId}`)
  }

  console.info('[Seed] Firestore seeded:', created, '| skipped:', skipped)
  return { created, skipped }
}

export { SEED_SESSION_ID, SEED_COURSE_ID, SEED_BATCH_ID }
