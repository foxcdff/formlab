import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import Layout from '../components/Layout'
import SurveyList from '../features/surveys/SurveyList'
import Editor from '../features/editor/Editor'
import TakeSurvey from '../features/responses/TakeSurvey'
import Results from '../features/responses/Results'
import Login from './Login'
import Done from '../features/responses/Done'

function Protected() {
  const location = useLocation()
  return localStorage.getItem('formlab-user') ? <Layout /> : <Navigate to="/login" state={{ from: location }} replace />
}
export default function App() {
  return <Routes>
    <Route path="/login" element={<Login />} />
    <Route path="/" element={<Navigate to="/surveys" replace />} />
    <Route element={<Protected />}>
      <Route path="/surveys" element={<SurveyList />} />
      <Route path="/surveys/:id/edit" element={<Editor />} />
      <Route path="/surveys/:id/preview" element={<TakeSurvey preview />} />
      <Route path="/surveys/:id/results" element={<Results />} />
    </Route>
    <Route path="/s/:id" element={<TakeSurvey />} />
    <Route path="/s/:id/done" element={<Done />} />
    <Route path="*" element={<div className="not-found"><h1>404</h1><p>Такой страницы нет</p><a href="/surveys">На главную</a></div>} />
  </Routes>
}