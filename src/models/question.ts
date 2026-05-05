export type QuestionType = 'multipleChoice' | 'yesNo' | 'rating' | 'openText'

export interface Question {
  questionId: string
  sessionId: string
  text: string
  type: QuestionType
  options: string[]
  order: number
  isActive: boolean
  createdAt: string
}
