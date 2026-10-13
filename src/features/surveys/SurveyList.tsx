import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams, useNavigate } from 'react-router-dom'
import { useCreateSurveyMutation, useDeleteSurveyMutation, useDuplicateSurveyMutation, useGetSurveysQuery } from './surveysApi'
import type { SurveyStatus } from './types'

const statusNames: Record<SurveyStatus, string> = { draft: 'Черновик', published: 'Опубликован', closed: 'Закрыт' }
export default function SurveyList() {
  const { data = [], isLoading, isError, refetch } = useGetSurveysQuery()
  const [createSurvey, createState] = useCreateSurveyMutation()
  const [deleteSurvey] = useDeleteSurveyMutation()
  const [duplicateSurvey] = useDuplicateSurveyMutation()
  const [params, setParams] = useSearchParams()
  const navigate = useNavigate()
  const [search, setSearch] = useState(params.get('q') || '')
  useEffect(() => { const timer = window.setTimeout(() => { const next = new URLSearchParams(params); search ? next.set('q', search) : next.delete('q'); setParams(next, { replace: true }) }, 250); return () => window.clearTimeout(timer) }, [search])
  const status = params.get('status') || 'all'
  const sort = params.get('sort') || 'new'
  const surveys = useMemo(() => data.filter((survey) => survey.title.toLowerCase().includes((params.get('q') || '').toLowerCase())).filter((survey) => status === 'all' || survey.status === status).sort((a, b) => sort === 'old' ? a.createdAt.localeCompare(b.createdAt) : sort === 'name' ? a.title.localeCompare(b.title) : b.updatedAt.localeCompare(a.updatedAt)), [data, params, status, sort])
  const changeParam = (key: string, value: string) => { const next = new URLSearchParams(params); value === 'all' || value === 'new' ? next.delete(key) : next.set(key, value); setParams(next) }
  const create = async () => { const survey = await createSurvey().unwrap(); navigate(`/surveys/${survey.id}/edit`) }
  const copyLink = async (id: number) => { await navigator.clipboard?.writeText(`${location.origin}/s/${id}`); alert('Ссылка скопирована') }
  return <div className="page-wrap">
    <header className="topbar"><div><div className="breadcrumb">Рабочее пространство <span>/</span> Мои опросы</div><h1>Мои опросы <span className="count-pill">{data.length}</span></h1><p className="muted">Создавайте опросы, собирайте ответы и находите инсайты.</p></div><button className="btn primary" onClick={create} disabled={createState.isLoading}>＋ Создать опрос</button></header>
    <section className="stats-grid">
      <div className="stat-card"><span className="stat-icon violet">▤</span><div><small>Всего опросов</small><strong>{data.length}</strong><span className="stat-foot">В вашем пространстве</span></div></div>
      <div className="stat-card"><span className="stat-icon green">↗</span><div><small>Опубликовано</small><strong>{data.filter((s) => s.status === 'published').length}</strong><span className="stat-foot">Готовы принимать ответы</span></div></div>
      <div className="stat-card"><span className="stat-icon orange">▣</span><div><small>Всего ответов</small><strong>{data.reduce((sum, s) => sum + Number(localStorage.getItem(`formlab-response-count-${s.id}`) || 0), 0)}</strong><span className="stat-foot">Ответы респондентов</span></div></div>
    </section>
    <section className="panel survey-panel">
      <div className="panel-heading"><div><h2>Все опросы</h2><p className="muted">Управляйте своими формами в одном месте</p></div><button className="btn outline" onClick={() => changeParam('sort', sort === 'new' ? 'old' : sort === 'old' ? 'name' : 'new')}>↕ {sort === 'new' ? 'Сначала новые' : sort === 'old' ? 'Сначала старые' : 'По названию'}</button></div>
      <div className="filters"><label className="search-box"><span>⌕</span><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Поиск по названию..." /></label><select aria-label="Статус" value={status} onChange={(e) => changeParam('status', e.target.value)}><option value="all">Все статусы</option><option value="draft">Черновики</option><option value="published">Опубликованы</option><option value="closed">Закрыты</option></select><span className="results-count">{surveys.length} результата</span></div>
      {isLoading ? <div className="skeleton-list"><div /><div /><div /></div> : isError ? <div className="empty-state"><h3>Не удалось загрузить опросы</h3><button className="btn outline" onClick={() => refetch()}>Повторить</button></div> : surveys.length === 0 ? <div className="empty-state"><div className="empty-icon">⌕</div><h3>Пока ничего не найдено</h3><p>Измените поиск или создайте новый опрос.</p><button className="btn primary" onClick={create}>＋ Создать опрос</button></div> : <div className="survey-list">{surveys.map((survey, index) => <article className="survey-row" key={survey.id}>
        <div className={`survey-thumb thumb-${index % 4}`}><span>{survey.title.slice(0, 1).toUpperCase()}</span><i>▤</i></div>
        <div className="survey-info"><Link className="survey-title" to={`/surveys/${survey.id}/edit`}>{survey.title}</Link><p>{survey.questions.length} {survey.questions.length === 1 ? 'вопрос' : 'вопросов'} <span>·</span> Изменён {new Date(survey.updatedAt).toLocaleDateString('ru-RU')}</p></div>
        <span className={`status-badge ${survey.status}`}>{statusNames[survey.status]}</span><div className="response-number"><b>{Number(localStorage.getItem(`formlab-response-count-${survey.id}`) || 0)}</b><small>ответов</small></div>
        <div className="row-actions"><Link title="Редактировать" to={`/surveys/${survey.id}/edit`}>↗</Link><button title="Копировать ссылку" onClick={() => void copyLink(survey.id)}>⌁</button><button title="Дублировать" onClick={() => void duplicateSurvey(survey)}>▣</button><button title="Удалить" onClick={() => { if (confirm('Удалить этот опрос?')) void deleteSurvey(survey.id) }}>×</button></div>
      </article>)}</div>}
      <div className="panel-footer"><span>Показано {surveys.length} из {data.length} опросов</span><span>FormLab · Ваше рабочее пространство</span></div>
    </section>
    <div className="tip-box"><span>✦</span><div><b>Маленький совет</b><p>Хороший опрос начинается с ясной цели. Короткие вопросы помогают получать больше ответов.</p></div><Link to="/surveys">Подробнее →</Link></div>
  </div>
}