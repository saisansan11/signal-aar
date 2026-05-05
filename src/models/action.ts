export type ActionStatus = 'pending' | 'inProgress' | 'done' | 'cancelled'

export interface Action {
  actionId: string
  issueId: string
  description: string
  responsiblePerson: string
  startDate: string
  dueDate: string
  status: ActionStatus
  evidenceNote: string
  createdAt: string
  updatedAt: string
}
