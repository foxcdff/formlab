import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { z } from 'zod'
import { useGetSurveyQuery, useSubmitResponseMutation } from '../surveys/surveysApi'
import type { AnswerValue, Question } from '../surveys/types'

function answerSchema(questions: Question[]) {
  return z.object(Object.fromEntries(questions.map((q) => [q.id, q.required ? z.union([z.string().min(1, 'Ответьте на этот вопрос'), z.array(z.string()).min(1, 'Выберите хотя бы один вариант'), z.number(), z.null().refine(() => false, 'Ответьте на этот вопрос')]) : z.unknown().optional()])))
}
export default function TakeSurvey({ preview = false }: { preview?: boolean }) {
  const { id } = useParams()
  const surveyId = Number(id)
  const { data: survey, isLoading } = useGetSurveyQuery(surveyId)
  const [submitResponse, submitState] = useSubmitResponseMutation()
  const [answers, setAnswers] = useState<Record<string, AnswerValue>>({})
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [alreadyDone, setAlreadyDone] = useState(false)
  const navigate = useNavigate()
  const schema = useMemo(() => survey ? answerSchema(survey.questions) : z.object({}), [survey])
  useEffect(() => { if (!preview && localStorage.getItem(`formlab-done-${surveyId}`)) setAlreadyDone(true); const saved = localStorage.getItem(`formlab-draft-${surveyId}`); if (saved) { try { setAnswers(JSON.parse(saved) as Record<string, AnswerValue>) } catch { /* Игнорируем старый черновик. */ } } }, [surveyId, preview])
  useEffect(() => { if (!preview) localStorage.setItem(`formlab-draft-${surveyId}`, JSON.stringify(answers)) }, [answers, surveyId, preview])
  if (isLoading) return <div className="public-page"><div className="loading-text">Загрузка опроса…</div></div>
  if (!survey) return <div className="public-page"><div className="public-card"><h1>Опрос не найден</h1><Link to="/surveys">На главную</Link></div></div>
  if (!preview && (survey.status !== 'published' || alreadyDone)) return <div className="public-page"><div className="public-card unavailable"><div className="modal-success">!</div><h1>{alreadyDone ? 'Вы уже прошли этот опрос' : 'Опрос недоступен'}</h1><p>{alreadyDone ? 'Спасибо за участие!' : 'Автор пока не принимает ответы на этот опрос.'}</p></div></div>
  const setAnswer = (questionId: string, value: AnswerValue) => setAnswers((old) => ({ ...old, [questionId]: value }))
  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const result = schema.safeParse(answers)
    if (!result.success) { const next: Record<string, string> = {}; result.error.issues.forEach((issue) => { const key = String(issue.path[0] || ''); if (key) next[key] = issue.message }); setErrors(next); document.getElementById(`question-${Object.keys(next)[0]}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' }); return }
    if (preview) { alert('Предпросмотр: ответы не отправляются'); return }
    await submitResponse({ surveyId, answers, submittedAt: new Date().toISOString() }).unwrap()
    localStorage.removeItem(`formlab-draft-${surveyId}`); localStorage.setItem(`formlab-done-${surveyId}`, 'true')
    const count = Number(localStorage.getItem(`formlab-response-count-${surveyId}`) || 0)
    localStorage.setItem(`formlab-response-count-${surveyId}`, String(count + 1))
    navigate(`/s/${surveyId}/done`)
  }
  const renderQuestion = (question: Question) => {
    const value = answers[question.id]
    if (question.type === 'short_text') return <input value={typeof value === 'string' ? value : ''} onChange={(e) => setAnswer(question.id, e.target.value)} placeholder="Ваш ответ" />
    if (question.type === 'long_text') return <textarea value={typeof value === 'string' ? value : ''} onChange={(e) => setAnswer(question.id, e.target.value)} placeholder="Напишите ответ..." rows={4} />
    if (question.type === 'date') return <input type="date" value={typeof value === 'string' ? value : ''} onChange={(e) => setAnswer(question.id, e.target.value)} />
    if (question.type === 'rating') return <div className="rating-input">{[1, 2, 3, 4, 5].map((n) => <button type="button" className={Number(value) >= n ? 'chosen' : ''} key={n} onClick={() => setAnswer(question.id, n)}>★</button>)}</div>
    if (question.type === 'scale') { const min = question.scale?.min ?? 1; const max = question.scale?.max ?? 10; return <div><div className="scale-input">{Array.from({ length: Math.max(0, Math.min(20, max - min + 1)) }, (_, i) => min + i).map((n) => <button type="button" key={n} className={value === n ? 'chosen' : ''} onClick={() => setAnswer(question.id, n)}>{n}</button>)}</div><div className="scale-labels"><span>{question.scale?.minLabel || min}</span><span>{question.scale?.maxLabel || max}</span></div></div> }
    if (question.type === 'dropdown') return <select value={typeof value === 'string' ? value : ''} onChange={(e) => setAnswer(question.id, e.target.value)}><option value="">Выберите вариант</option>{question.options?.map((o) => <option key={o.id} value={o.label}>{o.label}</option>)}</select>
    return <div className="choice-list">{question.options?.map((option) => <label className="choice-option" key={option.id}><input type={question.type === 'multiple_choice' ? 'checkbox' : 'radio'} name={question.id} checked={question.type === 'multiple_choice' ? Array.isArray(value) && value.includes(option.label) : value === option.label} onChange={(e) => setAnswer(question.id, question.type === 'multiple_choice' ? e.target.checked ? [...(Array.isArray(value) ? value : []), option.label] : (Array.isArray(value) ? value.filter((v) => v !== option.label) : []) : option.label)} /><span>{option.label}</span></label>)}</div>
  }
  return <div className="public-page"><div className="public-brand"><span className="brand-icon">F</span> FormLab</div>{preview && <div className="preview-banner">Режим предпросмотра <Link to={`/surveys/${surveyId}/edit`}>Вернуться в редактор</Link></div>}<form className="public-form" onSubmit={(e) => void submit(e)}><div className="public-form-heading"><div className="public-cover"></div><div className="public-form-title"><h1>{survey.title}</h1>{survey.description && <p>{survey.description}</p>}<div className="required-note">* Обязательный вопрос</div></div></div>{survey.questions.map((question, index) => <section className={`public-question ${errors[question.id] ? 'has-error' : ''}`} id={`question-${question.id}`} key={question.id}><label className="public-question-title">{index + 1}. {question.title || 'Без названия'} {question.required && <span>*</span>}</label>{question.description && <p>{question.description}</p>}{renderQuestion(question)}{errors[question.id] && <div className="error-text">{errors[question.id]}</div>}</section>)}<button className="btn primary public-submit" type="submit" disabled={submitState.isLoading}>{preview ? 'Проверить предпросмотр' : submitState.isLoading ? 'Отправка…' : 'Отправить ответы'} →</button><p className="public-footer">Создано с помощью <b>FormLab</b></p></form></div>
}