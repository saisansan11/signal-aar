export interface Response {
  responseId: string
  sessionId: string
  questionId: string
  batchId: string
  studentAlias: string
  answerText: string
  selectedOption: string
  ratingValue: number | null
  createdAt: string
}
