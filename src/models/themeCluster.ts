export type ThemeCategory =
  | 'content'
  | 'time'
  | 'equipment'
  | 'instructor'
  | 'practice'
  | 'assessment'
  | 'location'
  | 'safety'
  | 'other'

export interface ThemeCluster {
  clusterId: string
  sessionId: string
  questionId: string
  themeTitle: string
  category: ThemeCategory
  keywords: string[]
  responseIds: string[]
  count: number
  percentage: number
  representativeComments: string[]
  createdAt: string
  updatedAt: string
}
