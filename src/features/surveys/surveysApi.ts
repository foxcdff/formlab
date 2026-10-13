import { createApi, fakeBaseQuery } from '@reduxjs/toolkit/query/react'
import type { Survey, SurveyResponse } from './types'

const SURVEYS_KEY = 'formlab-surveys'
const RESPONSES_KEY = 'formlab-responses'

function read<T>(key: string, fallback: T): T {
  try {
    const value = localStorage.getItem(key)
    return value ? JSON.parse(value) as T : fallback
  } catch { return fallback }
}
function write<T>(key: string, value: T) { localStorage.setItem(key, JSON.stringify(value)) }
function seed(): Survey[] {
  const now = new Date().toISOString()
  return [
    { id: 1, userId: 1, title: 'Обратная связь о мероприятии', description: 'Расскажите, как всё прошло', status: 'published', createdAt: now, updatedAt: now, questions: [
      { id: 'q1', type: 'single_choice', title: 'Как вам мероприятие?', required: true, options: [{ id: 'o1', label: 'Отлично' }, { id: 'o2', label: 'Хорошо' }, { id: 'o3', label: 'Можно лучше' }] },
      { id: 'q2', type: 'rating', title: 'Оцените организацию', required: true },
      { id: 'q3', type: 'long_text', title: 'Что можно улучшить?', required: false },
    ] },
    { id: 2, userId: 1, title: 'Знакомство с командой', description: '', status: 'draft', createdAt: now, updatedAt: now, questions: [
      { id: 'q4', type: 'short_text', title: 'Как вас зовут?', required: true },
      { id: 'q5', type: 'dropdown', title: 'Ваш отдел', required: false, options: [{ id: 'o4', label: 'Разработка' }, { id: 'o5', label: 'Дизайн' }] },
    ] },
    { id: 3, userId: 1, title: 'Удобство нового сервиса', description: '', status: 'closed', createdAt: now, updatedAt: now, questions: [
      { id: 'q6', type: 'scale', title: 'Насколько удобно пользоваться?', required: true, scale: { min: 1, max: 10, minLabel: 'Неудобно', maxLabel: 'Удобно' } },
    ] },
  ]
}
function getSurveys(): Survey[] {
  const value = read<Survey[] | null>(SURVEYS_KEY, null)
  if (value) return value
  const initial = seed()
  write(SURVEYS_KEY, initial)
  return initial
}
function getResponses(): SurveyResponse[] { return read(RESPONSES_KEY, []) }
function saveSurveys(items: Survey[]) { write(SURVEYS_KEY, items) }

export const surveysApi = createApi({
  reducerPath: 'surveysApi',
  baseQuery: fakeBaseQuery<string>(),
  tagTypes: ['Survey', 'Response'],
  endpoints: (builder) => ({
    getSurveys: builder.query<Survey[], void>({
      queryFn: () => ({ data: getSurveys() }), providesTags: ['Survey'],
    }),
    getSurvey: builder.query<Survey, number>({
      queryFn: (id) => {
        const found = getSurveys().find((survey) => survey.id === id)
        return found ? { data: found } : { error: 'Опрос не найден' }
      },
      providesTags: (_result, _error, id) => [{ type: 'Survey', id }],
    }),
    saveSurvey: builder.mutation<Survey, Survey>({
      queryFn: (survey) => {
        const all = getSurveys()
        const next = { ...survey, updatedAt: new Date().toISOString() }
        saveSurveys(all.some((item) => item.id === survey.id) ? all.map((item) => item.id === survey.id ? next : item) : [...all, next])
        return { data: next }
      }, invalidatesTags: ['Survey'],
    }),
    createSurvey: builder.mutation<Survey, void>({
      queryFn: () => {
        const all = getSurveys()
        const now = new Date().toISOString()
        const survey: Survey = { id: Date.now(), userId: 1, title: 'Новый опрос', description: '', status: 'draft', questions: [], createdAt: now, updatedAt: now }
        saveSurveys([...all, survey])
        return { data: survey }
      }, invalidatesTags: ['Survey'],
    }),
    deleteSurvey: builder.mutation<number, number>({
      queryFn: (id) => { saveSurveys(getSurveys().filter((item) => item.id !== id)); return { data: id } },
      invalidatesTags: ['Survey'],
    }),
    duplicateSurvey: builder.mutation<Survey, Survey>({
      queryFn: (survey) => {
        const now = new Date().toISOString()
        const copy: Survey = { ...survey, id: Date.now(), title: `${survey.title} — копия`, status: 'draft', createdAt: now, updatedAt: now, questions: survey.questions.map((q) => ({ ...q, id: crypto.randomUUID(), options: q.options?.map((o) => ({ ...o, id: crypto.randomUUID() })) })) }
        saveSurveys([...getSurveys(), copy])
        return { data: copy }
      }, invalidatesTags: ['Survey'],
    }),
    getResponses: builder.query<SurveyResponse[], number>({
      queryFn: (id) => ({ data: getResponses().filter((response) => response.surveyId === id) }),
      providesTags: ['Response'],
    }),
    submitResponse: builder.mutation<SurveyResponse, Omit<SurveyResponse, 'id'>>({
      queryFn: (response) => {
        const item = { ...response, id: Date.now() }
        write(RESPONSES_KEY, [...getResponses(), item])
        return { data: item }
      }, invalidatesTags: ['Response'],
    }),
  }),
})
export const { useGetSurveysQuery, useGetSurveyQuery, useSaveSurveyMutation, useCreateSurveyMutation, useDeleteSurveyMutation, useDuplicateSurveyMutation, useGetResponsesQuery, useSubmitResponseMutation } = surveysApi
