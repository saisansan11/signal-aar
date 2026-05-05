import {
  collection, getDocs, addDoc, updateDoc, doc, query, where, serverTimestamp,
} from 'firebase/firestore'
import { db, USE_MOCK } from './firebase'
import { MOCK_ISSUES, MOCK_ACTIONS, MOCK_IMPACT_RECORDS } from './mockData'
import type { Issue, Action, ImpactRecord, IssueStatus } from '../models'
import { newId } from '../utils/id'
import { nowIso } from '../utils/dateFormat'

export async function getAllIssues(): Promise<Issue[]> {
  if (USE_MOCK) return [...MOCK_ISSUES]
  const snap = await getDocs(collection(db!, 'issues'))
  return snap.docs.map(d => ({ ...d.data(), issueId: d.id } as Issue))
}

export async function getIssuesByCourse(courseId: string): Promise<Issue[]> {
  if (USE_MOCK) return MOCK_ISSUES.filter(i => i.courseId === courseId)
  const q = query(collection(db!, 'issues'), where('courseId', '==', courseId))
  const snap = await getDocs(q)
  return snap.docs.map(d => ({ ...d.data(), issueId: d.id } as Issue))
}

export async function createIssue(data: Omit<Issue, 'issueId' | 'createdAt' | 'updatedAt'>): Promise<Issue> {
  const issue: Issue = { ...data, issueId: newId('i'), createdAt: nowIso(), updatedAt: nowIso() }
  if (!USE_MOCK) {
    const { issueId: _issueId, ...payload } = issue
    const ref = await addDoc(collection(db!, 'issues'), { ...payload, createdAt: serverTimestamp(), updatedAt: serverTimestamp() })
    return { ...issue, issueId: ref.id }
  }
  MOCK_ISSUES.push(issue)
  return issue
}

export async function updateIssueStatus(issueId: string, status: IssueStatus): Promise<void> {
  const update = { status, updatedAt: nowIso() }
  if (USE_MOCK) {
    const i = MOCK_ISSUES.find(i => i.issueId === issueId)
    if (i) Object.assign(i, update)
    return
  }
  await updateDoc(doc(db!, 'issues', issueId), { ...update, updatedAt: serverTimestamp() })
}

export async function getActionsByIssue(issueId: string): Promise<Action[]> {
  if (USE_MOCK) return MOCK_ACTIONS.filter(a => a.issueId === issueId)
  const q = query(collection(db!, 'actions'), where('issueId', '==', issueId))
  const snap = await getDocs(q)
  return snap.docs.map(d => ({ ...d.data(), actionId: d.id } as Action))
}

export async function getAllActions(): Promise<Action[]> {
  if (USE_MOCK) return [...MOCK_ACTIONS]
  const snap = await getDocs(collection(db!, 'actions'))
  return snap.docs.map(d => ({ ...d.data(), actionId: d.id } as Action))
}

export async function createAction(data: Omit<Action, 'actionId' | 'createdAt' | 'updatedAt'>): Promise<Action> {
  const action: Action = { ...data, actionId: newId('a'), createdAt: nowIso(), updatedAt: nowIso() }
  if (!USE_MOCK) {
    const { actionId: _actionId, ...payload } = action
    const ref = await addDoc(collection(db!, 'actions'), { ...payload, createdAt: serverTimestamp(), updatedAt: serverTimestamp() })
    return { ...action, actionId: ref.id }
  }
  MOCK_ACTIONS.push(action)
  return action
}

export async function getAllImpactRecords(): Promise<ImpactRecord[]> {
  if (USE_MOCK) return [...MOCK_IMPACT_RECORDS]
  const snap = await getDocs(collection(db!, 'impactRecords'))
  return snap.docs.map(d => ({ ...d.data(), impactId: d.id } as ImpactRecord))
}
