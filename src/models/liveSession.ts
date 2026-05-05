export type SessionStatus = 'draft' | 'active' | 'closed'

export interface LiveSession {
  sessionId: string
  courseId: string
  batchId: string
  title: string
  status: SessionStatus
  currentQuestionId: string | null
  joinCode: string
  createdBy: string
  createdAt: string
  closedAt: string | null
}
