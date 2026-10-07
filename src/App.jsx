import { Navigate, Route, Routes } from 'react-router-dom'
import { configured } from './lib/supabase.js'
import { AuthProvider, useAuth } from './lib/auth.jsx'
import Layout from './components/Layout.jsx'
import Login from './pages/Login.jsx'
import Landing from './pages/Landing.jsx'
import Logo from './components/Logo.jsx'
import Home from './pages/Home.jsx'
import Projects from './pages/Projects.jsx'
import Scripts from './pages/Scripts.jsx'
import ProjectLayout from './pages/ProjectLayout.jsx'
import Overview from './pages/Overview.jsx'
import ScriptPage from './pages/ScriptPage.jsx'
import ScenesPage from './pages/ScenesPage.jsx'
import BreakdownPage from './pages/BreakdownPage.jsx'
import CharactersPage from './pages/CharactersPage.jsx'
import LocationsPage from './pages/LocationsPage.jsx'
import StoryboardPage from './pages/StoryboardPage.jsx'
import ShotListPage from './pages/ShotListPage.jsx'
import SchedulePage from './pages/SchedulePage.jsx'
import CrewPage from './pages/CrewPage.jsx'
import EquipmentPage from './pages/EquipmentPage.jsx'
import CallSheetPage from './pages/CallSheetPage.jsx'
import TasksPage from './pages/TasksPage.jsx'
import OnSetPage from './pages/OnSetPage.jsx'
import SlatePage from './pages/SlatePage.jsx'
import ExportsPage from './pages/ExportsPage.jsx'

function FullMessage({ title, children }) {
  return (
    <div className="center-screen">
      <div className="auth-card">
        <div className="auth-logo"><Logo to={null} size="lg" /></div>
        {title && <h1 className="auth-title">{title}</h1>}
        {children}
      </div>
    </div>
  )
}

function SetupScreen() {
  return (
    <FullMessage title="Almost there">
      <p className="muted-text">
        The site is online, but it is not connected to its database yet. In Vercel, open your project, go to Settings,
        then Environment Variables, and add these two:
      </p>
      <pre className="code-box">VITE_SUPABASE_URL{'\n'}VITE_SUPABASE_ANON_KEY</pre>
      <p className="muted-text">Then go to Deployments and redeploy so the new values are used.</p>
    </FullMessage>
  )
}

function RequireAuth({ children }) {
  const { loading, user, profile, profileError, signOut } = useAuth()

  if (loading) return <FullMessage><p className="muted-text">Loading…</p></FullMessage>
  if (!user) return <Navigate to="/" replace />
  if (profileError)
    return (
      <FullMessage title="Your account could not load">
        <p className="muted-text">{profileError}</p>
        <p className="muted-text">
          If this is a brand new setup, the database tables may not exist yet. Run the SQL setup file in Supabase, then
          refresh this page.
        </p>
        <button className="btn btn-ghost" onClick={signOut}>
          Sign out
        </button>
      </FullMessage>
    )
  if (!profile) return <FullMessage><p className="muted-text">Setting up your workspace…</p></FullMessage>
  return children
}

function LoginRoute() {
  const { loading, user } = useAuth()
  if (loading) return <FullMessage><p className="muted-text">Loading…</p></FullMessage>
  if (user) return <Navigate to="/home" replace />
  return <Login />
}

export default function App() {
  if (!configured) return <SetupScreen />
  return (
    <AuthProvider>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<LoginRoute />} />
        <Route
          element={
            <RequireAuth>
              <Layout />
            </RequireAuth>
          }
        >
          <Route path="/home" element={<Home />} />
          <Route path="/projects" element={<Projects />} />
          <Route path="/scripts" element={<Scripts />} />
          <Route path="/project/:projectId" element={<ProjectLayout />}>
            <Route index element={<Overview />} />
            <Route path="script" element={<ScriptPage />} />
            <Route path="scenes" element={<ScenesPage />} />
            <Route path="breakdown" element={<BreakdownPage />} />
            <Route path="characters" element={<CharactersPage />} />
            <Route path="locations" element={<LocationsPage />} />
            <Route path="storyboard" element={<StoryboardPage />} />
            <Route path="shots" element={<ShotListPage />} />
            <Route path="schedule" element={<SchedulePage />} />
            <Route path="crew" element={<CrewPage />} />
            <Route path="equipment" element={<EquipmentPage />} />
            <Route path="callsheets" element={<CallSheetPage />} />
            <Route path="tasks" element={<TasksPage />} />
            <Route path="onset" element={<OnSetPage />} />
            <Route path="slate" element={<SlatePage />} />
            <Route path="exports" element={<ExportsPage />} />
          </Route>
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
  )
}
