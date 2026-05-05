import { collection, getDocs, addDoc, serverTimestamp } from 'firebase/firestore'
import { db, USE_MOCK } from './firebase'
import { MOCK_COURSES } from './mockData'
import type { Course } from '../models'
import { newId } from '../utils/id'
import { nowIso } from '../utils/dateFormat'

export async function getCourses(): Promise<Course[]> {
  if (USE_MOCK) return MOCK_COURSES
  const snap = await getDocs(collection(db!, 'courses'))
  return snap.docs.map(d => ({ courseId: d.id, ...d.data() } as Course))
}

export async function createCourse(data: Omit<Course, 'courseId' | 'createdAt'>): Promise<Course> {
  const course: Course = { ...data, courseId: newId('c'), createdAt: nowIso() }
  if (!USE_MOCK) {
    const ref = await addDoc(collection(db!, 'courses'), { ...data, createdAt: serverTimestamp() })
    return { ...course, courseId: ref.id }
  }
  MOCK_COURSES.push(course)
  return course
}
