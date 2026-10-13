export type QuestionType =
  | 'short_text' | 'long_text' | 'single_choice' | 'multiple_choice'
  | 'dropdown' | 'scale' | 'rating' | 'date'

export interface Option { id: string; label: string }
export interface Question {
  id: string
  type: QuestionType
  title: string
  description?: string
  required: boolean
  options?: Option[]
  scale?: { min: number; max: number; minLabel?: string; maxLabel?: string }
}
export type SurveyStatus = 'draft' | 'published' | 'closed'
export interface Survey {
  id: number
  userId: number
  title: string
  description?: string
  status: SurveyStatus
  questions: Question[]
  createdAt: string
  updatedAt: string
}
export type AnswerValue = string | string[] | number | null
export interface SurveyResponse {
  id: number
  surveyId: number
  answers: Record<string, AnswerValue>
  submittedAt: string
}
