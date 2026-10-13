import { NavLink, Outlet, useNavigate } from 'react-router-dom'

export default function Layout() {
  const navigate = useNavigate()
  const logout = () => {
    localStorage.removeItem('formlab-user')
    navigate('/login')
  }
  return <div className="app-shell">
    <aside className="sidebar">
      <div className="brand"><span className="brand-icon">F</span><span>FormLab<small>опросы без сложностей</small></span></div>
      <div className="side-label">РАБОЧЕЕ ПРОСТРАНСТВО</div>
      <NavLink to="/surveys" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}><span>▦</span> Мои опросы</NavLink>
      <div className="sidebar-bottom"><div className="avatar">А</div><div className="user-info"><b>Алексей</b><small>Автор опросов</small></div><button className="icon-button" title="Выйти" onClick={logout}>↗</button></div>
    </aside>
    <main className="main-area"><Outlet /></main>
  </div>
}