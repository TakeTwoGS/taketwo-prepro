import { Link, NavLink, Outlet } from 'react-router-dom'
import Menu from './Menu.jsx'
import { useAuth } from '../lib/auth.jsx'

export default function Layout() {
  const { user, beginner, setBeginner, signOut } = useAuth()
  const initial = (user?.email || '?').charAt(0).toUpperCase()

  return (
    <div className="app">
      <header className="topbar">
        <Link to="/" className="brand">
          <span className="brand-dot" aria-hidden="true" />
          TakeTwo PrePro
        </Link>
        <nav className="main-nav" aria-label="Main">
          <NavLink to="/" end>
            Home
          </NavLink>
          <NavLink to="/projects">Projects</NavLink>
          <NavLink to="/scripts">Scripts</NavLink>
        </nav>
        <div className="topbar-right">
          <label className="switch" title="Adds a (?) next to filmmaking terms and explains what each script element is for.">
            <input type="checkbox" checked={beginner} onChange={(e) => setBeginner(e.target.checked)} />
            <span className="switch-track" aria-hidden="true" />
            <span className="switch-label">Beginner mode</span>
          </label>
          <Menu
            label="Account"
            className="account-menu"
            items={[{ heading: user?.email }, { divider: true }, { label: 'Sign out', onClick: signOut }]}
          >
            <span className="avatar">{initial}</span>
          </Menu>
        </div>
      </header>
      <main className="app-main">
        <Outlet />
      </main>
    </div>
  )
}
