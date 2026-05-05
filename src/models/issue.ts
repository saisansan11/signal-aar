export type IssueSeverity = 'P1' | 'P2' | 'P3' | 'P4'
export type IssueStatus = 'open' | 'inProgress' | 'resolved' | 'ignored'
export type IssueCategory =
  | 'EQUIP'
  | 'TIME'
  | 'INSTR'
  | 'DOC'
  | 'CURR'
  | 'ASSESS'
  | 'LOC'
  | 'SAFE'
  | 'OTHER'

export interface Issue {
  issueId: string
  courseId: string
  batchId: string
  sourceSessionId: string
  sourceQuestionId: string
  sourceClusterId: string
  title: string
  category: IssueCategory
  severity: IssueSeverity
  frequencyCount: number
  percentage: number
  status: IssueStatus
  createdAt: string
  updatedAt: string
}
