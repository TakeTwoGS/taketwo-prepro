import { NavLink, Outlet } from 'react-router-dom'
import { FileText, FolderKanban, GraduationCap, House, Wrench } from 'lucide-react'
import Menu from './Menu.jsx'
import Logo from './Logo.jsx'
import { useAuth } from '../lib/auth.jsx'

export default function Layout() {
  const { user, beginner, setBeginner, signOut } = useAuth()
  const initial = (user?.email || '?').charAt(0).toUpperCase()
  const picture = user?.user_metadata?.avatar_url || user?.user_metadata?.picture

  return (
    <div className="app">
      <header className="topbar">
        <Logo to="/home" />
        <nav className="main-nav" aria-label="Main">
          <NavLink to="/home" end>
            <House size={16} /> <span>Home</span>
          </NavLink>
          <NavLink to="/projects">
            <FolderKanban size={16} /> <span>Projects</span>
          </NavLink>
          <NavLink to="/scripts">
            <FileText size={16} /> <span>Scripts</span>
          </NavLink>
          <NavLink to="/tools">
            <Wrench size={16} /> <span>Tools</span>
          </NavLink>
          <NavLink to="/learn">
            <GraduationCap size={16} /> <span>Learn</span>
          </NavLink>
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
            items={[
              { heading: user?.user_metadata?.full_name || user?.email },
              user?.user_metadata?.full_name && { heading: user?.email },
              { divider: true },
              { label: 'Sign out', onClick: signOut },
            ]}
          >
            <span className="avatar">
              {picture ? <img src={picture} alt="" referrerPolicy="no-referrer" /> : initial}
            </span>
          </Menu>
        </div>
      </header>
      <main className="app-main">
        <Outlet />
      </main>
    </div>
  )
}
