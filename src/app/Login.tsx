import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'

export default function Login() {
  const [register, setRegister] = useState(false)
  const [email, setEmail] = useState('hello@formlab.ru')
  const [password, setPassword] = useState('123456')
  const [confirm, setConfirm] = useState('123456')
  const [error, setError] = useState('')
  const navigate = useNavigate()
  const location = useLocation()
  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!email.includes('@')) { setError('Введите корректный email'); return }
    if (password.length < 6) { setError('Пароль должен быть не короче 6 символов'); return }
    if (register && password !== confirm) { setError('Пароли не совпадают'); return }
    const users = JSON.parse(localStorage.getItem('formlab-users') || '[]') as { email: string; password: string }[]
    if (register) {
      if (users.some((user) => user.email === email)) { setError('Такой email уже зарегистрирован'); return }
      localStorage.setItem('formlab-users', JSON.stringify([...users, { email, password }]))
    } else if (users.length && !users.some((user) => user.email === email && user.password === password) && email !== 'hello@formlab.ru') {
      setError('Неверный email или пароль'); return
    }
    localStorage.setItem('formlab-user', email)
    const from = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname
    navigate(from || '/surveys', { replace: true })
  }
  return <div className="auth-page"><div className="auth-card">
    <div className="brand auth-brand"><span className="brand-icon">F</span><span>FormLab<small>опросы без сложностей</small></span></div>
    <div className="eyebrow">ВАШЕ ПРОСТОЕ РЕШЕНИЕ</div><h1>{register ? 'Создайте аккаунт' : 'С возвращением!'}</h1>
    <p className="muted">{register ? 'Зарегистрируйтесь и создавайте свои опросы.' : 'Войдите, чтобы продолжить работу с опросами.'}</p>
    <form onSubmit={submit} className="form-stack">
      <label>Email<input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="you@example.com" /></label>
      <label>Пароль<input type="password" value={password} onChange={(e) => setPassword(e.target.value)} minLength={6} required /></label>
      {register && <label>Повторите пароль<input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required /></label>}
      {error && <div className="error-text">{error}</div>}
      <button className="btn primary full" type="submit">{register ? 'Зарегистрироваться' : 'Войти'} <span>→</span></button>
    </form>
    <div className="auth-switch">{register ? 'Уже есть аккаунт?' : 'Впервые здесь?'} <button onClick={() => { setRegister(!register); setError('') }}>{register ? 'Войти' : 'Создать аккаунт'}</button></div>
    <div className="demo-hint">Демо-вход: hello@formlab.ru / 123456</div>
  </div></div>
}