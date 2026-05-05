export interface ImpactRecord {
  impactId: string
  issueId: string
  beforeBatchId: string
  afterBatchId: string
  beforeScore: number
  afterScore: number
  beforeNote: string
  afterNote: string
  improvementSummary: string
  createdAt: string
}
