import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { DndContext, KeyboardSensor, PointerSensor, closestCenter, useSensor, useSensors } from '@dnd-kit/core'
import type { DragEndEvent } from '@dnd-kit/core'
import { SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useGetSurveyQuery, useSaveSurveyMutation } from '../surveys/surveysApi'
import type { Question, QuestionType, Survey } from '../surveys/types'

const types: { value: QuestionType; label: string }[] = [
  { value: 'short_text', label: 'Короткий текст' }, { value: 'long_text', label: 'Абзац' },
  { value: 'single_choice', label: 'Один вариант' }, { value: 'multiple_choice', label: 'Несколько вариантов' },
  { value: 'dropdown', label: 'Выпадающий список' }, { value: 'scale', label: 'Шкала' },
  { value: 'rating', label: 'Оценка звёздами' }, { value: 'date', label: 'Дата' },
]
function newQuestion(type: QuestionType = 'short_text'): Question {
  return { id: crypto.randomUUID(), type, title: '', description: '', required: false, ...( ['single_choice', 'multiple_choice', 'dropdown'].includes(type) ? { options: [{ id: crypto.randomUUID(), label: 'Вариант 1' }, { id: crypto.randomUUID(), label: 'Вариант 2' }] } : {}), ...(type === 'scale' ? { scale: { min: 1, max: 10, minLabel: '', maxLabel: '' } } : {}) }
}
function SortableQuestion({ question, index, update, remove, duplicate }: { question: Question; index: number; update: (q: Question) => void; remove: () => void; duplicate: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: question.id })
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.6 : 1 }
  const optionType = ['single_choice', 'multiple_choice', 'dropdown'].includes(question.type)
  const updateType = (type: QuestionType) => update({ ...question, type, options: ['single_choice', 'multiple_choice', 'dropdown'].includes(type) ? question.options?.length ? question.options : [{ id: crypto.randomUUID(), label: 'Вариант 1' }, { id: crypto.randomUUID(), label: 'Вариант 2' }] : undefined, scale: type === 'scale' ? question.scale || { min: 1, max: 10 } : undefined })
  return <div ref={setNodeRef} style={style} className="question-card">
    <div className="question-card-top"><button className="drag-handle" title="Перетащить вопрос" {...attributes} {...listeners}>⠿</button><span className="question-number">ВОПРОС {index + 1}</span><div className="question-tools"><button onClick={duplicate} title="Дублировать">▣</button><button onClick={remove} title="Удалить">×</button></div></div>
    <input className="question-title-input" aria-label="Заголовок вопроса" value={question.title} onChange={(e) => update({ ...question, title: e.target.value })} placeholder="Напишите вопрос..." />
    <input className="question-desc-input" aria-label="Описание вопроса" value={question.description || ''} onChange={(e) => update({ ...question, description: e.target.value })} placeholder="Описание (необязательно)" />
    <div className="question-settings"><label>Тип вопроса<select value={question.type} onChange={(e) => updateType(e.target.value as QuestionType)}>{types.map((type) => <option key={type.value} value={type.value}>{type.label}</option>)}</select></label></div>
    {optionType && <div className="option-editor">{(question.options || []).map((option, i) => <div className="option-line" key={option.id}><span>{question.type === 'multiple_choice' ? '□' : question.type === 'single_choice' ? '○' : '☷'}</span><input aria-label={`Вариант ${i + 1}`} value={option.label} onChange={(e) => update({ ...question, options: question.options?.map((o) => o.id === option.id ? { ...o, label: e.target.value } : o) })} /><button disabled={(question.options?.length || 0) <= 2} onClick={() => update({ ...question, options: question.options?.filter((o) => o.id !== option.id) })} title="Удалить вариант">×</button></div>)}<button className="text-button" onClick={() => update({ ...question, options: [...(question.options || []), { id: crypto.randomUUID(), label: `Вариант ${(question.options?.length || 0) + 1}` }] })}>＋ Добавить вариант</button>{question.options?.some((o) => !o.label.trim()) && <div className="error-text">Заполните текст вариантов</div>}</div>}
    {question.type === 'scale' && <div className="scale-settings"><label>От<input type="number" value={question.scale?.min ?? 1} onChange={(e) => update({ ...question, scale: { min: Number(e.target.value), max: question.scale?.max ?? 10, minLabel: question.scale?.minLabel, maxLabel: question.scale?.maxLabel } })} /></label><label>До<input type="number" value={question.scale?.max ?? 10} onChange={(e) => update({ ...question, scale: { min: question.scale?.min ?? 1, max: Number(e.target.value), minLabel: question.scale?.minLabel, maxLabel: question.scale?.maxLabel } })} /></label><label>Подпись слева<input value={question.scale?.minLabel || ''} onChange={(e) => update({ ...question, scale: { min: question.scale?.min ?? 1, max: question.scale?.max ?? 10, minLabel: e.target.value, maxLabel: question.scale?.maxLabel } })} /></label><label>Подпись справа<input value={question.scale?.maxLabel || ''} onChange={(e) => update({ ...question, scale: { min: question.scale?.min ?? 1, max: question.scale?.max ?? 10, minLabel: question.scale?.minLabel, maxLabel: e.target.value } })} /></label></div>}
    <div className="question-card-bottom"><label className="toggle-label"><input type="checkbox" checked={question.required} onChange={(e) => update({ ...question, required: e.target.checked })} /><span className="toggle"></span> Обязательный вопрос</label><span className="question-type-hint">{types.find((t) => t.value === question.type)?.label}</span></div>
  </div>
}
export default function Editor({ }: { } = {}) {
  const { id } = useParams()
  const surveyId = Number(id)
  const { data: survey, isLoading, isError } = useGetSurveyQuery(surveyId)
  const [saveSurvey, saveState] = useSaveSurveyMutation()
  const [draft, setDraft] = useState<Survey | null>(null)
  const [publishModal, setPublishModal] = useState(false)
  const [dirty, setDirty] = useState(false)
  const timer = useRef<number | undefined>(undefined)
  const navigate = useNavigate()
  const sensors = useSensors(useSensor(PointerSensor), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }))
  useEffect(() => { if (survey && !draft) setDraft(survey) }, [survey, draft])
  useEffect(() => () => window.clearTimeout(timer.current), [])
  useEffect(() => {
    if (!draft || !dirty) return
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => { void saveSurvey(draft).unwrap().then(() => setDirty(false)) }, 1200)
    return () => window.clearTimeout(timer.current)
  }, [draft, dirty])
  useEffect(() => {
    const beforeUnload = (event: BeforeUnloadEvent) => { if (dirty) { event.preventDefault(); event.returnValue = '' } }
    window.addEventListener('beforeunload', beforeUnload)
    return () => window.removeEventListener('beforeunload', beforeUnload)
  }, [dirty])
  const change = (next: Survey) => { setDraft(next); setDirty(true) }
  const updateQuestion = (question: Question) => draft && change({ ...draft, questions: draft.questions.map((q) => q.id === question.id ? question : q) })
  const publish = async () => {
    if (!draft) return
    if (!draft.title.trim()) { alert('Добавьте название опроса'); return }
    if (!draft.questions.length) { alert('Добавьте хотя бы один вопрос'); return }
    if (draft.questions.some((q) => !q.title.trim() || q.options?.some((o) => !o.label.trim()) || q.options && q.options.length < 2)) { alert('Проверьте заголовки вопросов и варианты ответов'); return }
    const next = { ...draft, status: 'published' as const }
    await saveSurvey(next).unwrap()
    setDraft(next); setDirty(false); setPublishModal(true)
  }
  if (isLoading || !draft) return <div className="page-wrap"><div className="loading-text">Загружаем редактор…</div></div>
  if (isError) return <div className="page-wrap"><h1>Опрос не найден</h1><Link to="/surveys">Назад</Link></div>
  const handleDragEnd = (event: DragEndEvent) => { const { active, over } = event; if (over && active.id !== over.id) { const oldIndex = draft.questions.findIndex((q) => q.id === active.id); const newIndex = draft.questions.findIndex((q) => q.id === over.id); change({ ...draft, questions: arrayMove(draft.questions, oldIndex, newIndex) }) } }
  return <div className="editor-page">
    <header className="editor-header"><Link to="/surveys" className="back-link">← <span>Мои опросы</span></Link><div className="save-status"><span className={`save-dot ${saveState.isError ? 'bad' : ''}`}></span>{saveState.isError ? 'Ошибка сохранения' : dirty || saveState.isLoading ? 'Сохранение…' : 'Сохранено'}</div><div className="header-actions"><Link className="btn outline" to={`/surveys/${surveyId}/preview`}>◉ Предпросмотр</Link><button className="btn primary" onClick={() => void publish()}>Опубликовать ↗</button></div></header>
    <div className="editor-layout"><main className="editor-main"><div className="editor-title-block"><div className="eyebrow">КОНСТРУКТОР ОПРОСА</div><input className="survey-name-input" value={draft.title} onChange={(e) => change({ ...draft, title: e.target.value })} aria-label="Название опроса" placeholder="Название опроса" /><textarea value={draft.description || ''} onChange={(e) => change({ ...draft, description: e.target.value })} aria-label="Описание опроса" placeholder="Добавьте описание, чтобы респондентам было понятно, о чём этот опрос" rows={2} /><div className="editor-meta"><span>▤ {draft.questions.length} вопросов</span><span>·</span><span>Автосохранение включено</span></div></div>
      <div className="question-list-head"><h2>Вопросы</h2><span>Перетаскивайте, чтобы изменить порядок</span></div>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}><SortableContext items={draft.questions.map((q) => q.id)} strategy={verticalListSortingStrategy}>{draft.questions.map((question, index) => <SortableQuestion key={question.id} question={question} index={index} update={updateQuestion} remove={() => change({ ...draft, questions: draft.questions.filter((q) => q.id !== question.id) })} duplicate={() => { const copy = { ...question, id: crypto.randomUUID(), options: question.options?.map((o) => ({ ...o, id: crypto.randomUUID() })) }; change({ ...draft, questions: [...draft.questions.slice(0, index + 1), copy, ...draft.questions.slice(index + 1)] }) }} />)}</SortableContext></DndContext>
      <button className="add-question" onClick={() => change({ ...draft, questions: [...draft.questions, newQuestion()] })}><span>＋</span><b>Добавить вопрос</b><small>Выберите тип и настройте поля</small></button>
    </main><aside className="editor-sidebar"><div className="side-panel"><div className="side-panel-title"><span>✦</span><h3>Советы по опросу</h3></div><div className="side-tip"><b>Будьте краткими</b><p>Короткие и понятные вопросы помогают получать больше ответов.</p></div><div className="side-tip"><b>Обязательные поля</b><p>Отмечайте обязательными только те вопросы, без которых нельзя обойтись.</p></div><div className="side-tip"><b>Проверьте перед публикацией</b><p>Откройте предпросмотр и убедитесь, что всё выглядит хорошо.</p></div></div><div className="side-panel"><h3>Типы вопросов</h3><div className="type-chips">{types.map((t) => <button key={t.value} onClick={() => change({ ...draft, questions: [...draft.questions, newQuestion(t.value)] })}>＋ {t.label}</button>)}</div></div></aside></div>
    {publishModal && <div className="modal-backdrop"><div className="modal-card"><button className="modal-close" onClick={() => setPublishModal(false)}>×</button><div className="modal-success">✓</div><h2>Опрос опубликован!</h2><p>Теперь можно поделиться ссылкой с респондентами.</p><div className="copy-link-field">{location.origin}/s/{surveyId}</div><button className="btn primary full" onClick={() => { void navigator.clipboard?.writeText(`${location.origin}/s/${surveyId}`); setPublishModal(false) }}>Скопировать ссылку</button><button className="text-button" onClick={() => navigate(`/surveys/${surveyId}/results`)}>Перейти к результатам →</button></div></div>}
  </div>
}