import { Link, Navigate } from 'react-router-dom'
import { CalendarDays, Clapperboard, GraduationCap, Layers, ListTree, PenLine, Printer, Rows3, Users } from 'lucide-react'
import GoogleButton from '../components/GoogleButton.jsx'
import Logo from '../components/Logo.jsx'
import { useAuth } from '../lib/auth.jsx'

const FEATURES = [
  { icon: PenLine, tone: 'pink', title: 'A real screenplay editor', text: 'Press Enter and Tab to move between scene headings, action, and dialogue. The formatting takes care of itself.' },
  { icon: ListTree, tone: 'violet', title: 'Scenes build themselves', text: 'Every scene heading becomes a scene with its location, time of day, and characters. Drag to reorder.' },
  { icon: Layers, tone: 'blue', title: 'Storyboards without drawing skills', text: 'Drop in pictures, or sketch right on a frame. Arrows show where people and the camera move.' },
  { icon: Rows3, tone: 'teal', title: 'Shot lists that stay in sync', text: 'A storyboard frame becomes a shot with one click. Change it in one place and it updates everywhere.' },
  { icon: CalendarDays, tone: 'amber', title: 'Schedules and call sheets', text: 'Drag scenes onto shoot days, get helpful warnings, and print a call sheet built from your plan.' },
  { icon: Clapperboard, tone: 'rose', title: 'On-Set Mode and a digital slate', text: 'Big buttons for filming day. Log takes, track progress, and show a slate on your phone.' },
  { icon: Users, tone: 'violet', title: 'Work together', text: 'Share a project, leave comments, save script versions, and watch edits appear live.' },
  { icon: GraduationCap, tone: 'blue', title: 'Tools and guides', text: 'Calculators, shot guides, a film glossary, and short lessons. Beginner mode explains terms as you go.' },
  { icon: Printer, tone: 'teal', title: 'Print or save as PDF', text: 'Clean exports of your script, storyboard, shot list, schedule, call sheet, and checklists.' },
]

const STEPS = ['Script', 'Scenes', 'Storyboard', 'Shot list', 'Schedule', 'Call sheet', 'On set']

function AppPreview() {
  return (
    <div className="preview" aria-hidden="true">
      <div className="pv-window">
        <div className="pv-bar">
          <span /> <span /> <span />
        </div>
        <div className="pv-body">
          <div className="pv-side">
            <div className="pv-side-title">Scenes</div>
            <div className="pv-scene on"><b>1</b> INT. DINER - NIGHT</div>
            <div className="pv-scene"><b>2</b> EXT. PARKING LOT - NIGHT</div>
            <div className="pv-scene"><b>3</b> INT. MAYA'S CAR - NIGHT</div>
            <div className="pv-scene"><b>4</b> EXT. HIGHWAY - DAWN</div>
          </div>
          <div className="pv-page">
            <div className="pv-tools">
              <i className="on">Scene</i>
              <i>Action</i>
              <i>Character</i>
              <i>Dialogue</i>
            </div>
            <div className="pv-sheet">
              <div className="ls-scene">INT. DINER - NIGHT</div>
              <div className="ls-action">Rain on the glass. MAYA (30s) stirs a coffee that went cold an hour ago.</div>
              <div className="ls-char">MAYA</div>
              <div className="ls-paren">(quietly)</div>
              <div className="ls-dialogue">He said he would be here by nine.</div>
              <div className="ls-action">The bell over the door rings. It is only the wind.</div>
            </div>
          </div>
        </div>
      </div>
      <div className="pv-float pv-float-a">
        <strong>4 scenes</strong>
        <span>3 night, 1 day</span>
      </div>
      <div className="pv-float pv-float-b">
        <strong>About 12 min</strong>
        <span>12 pages</span>
      </div>
    </div>
  )
}

export default function Landing() {
  const { user, loading } = useAuth()
  if (!loading && user) return <Navigate to="/home" replace />

  return (
    <div className="landing">
      <header className="land-head">
        <Logo to="/" />
        <nav className="land-links" aria-label="Page sections">
          <a href="#features">What you get</a>
          <a href="#roadmap">How it fits together</a>
        </nav>
        <Link to="/login" className="btn btn-primary btn-sm">
          Log in
        </Link>
      </header>

      <section className="land-hero">
        <div className="land-copy">
          <h1>Take your film from an idea to the set.</h1>
          <p>
            A simple, free workspace for student and independent filmmakers. Write your script, watch your scenes organize
            themselves, and keep everything for your film in one place.
          </p>
          <GoogleButton className="left" />
          <small className="land-note">Free to use. You log in with your Google account.</small>
        </div>
        <AppPreview />
      </section>

      <section id="features" className="land-section">
        <h2 className="land-h2">Everything you need to start pre-production</h2>
        <p className="land-sub">No spreadsheets, no complicated software. Just the tools, in plain language.</p>
        <div className="feature-grid">
          {FEATURES.map((f) => (
            <div key={f.title} className="feature">
              <span className={'tile tone-' + f.tone}>
                <f.icon size={20} />
              </span>
              <h3>{f.title}</h3>
              <p>{f.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="roadmap" className="land-section">
        <h2 className="land-h2">One place from first draft to first day on set</h2>
        <p className="land-sub">Everything you enter once is reused everywhere else, from the first scene to the last take.</p>
        <ol className="steps">
          {STEPS.map((name) => (
            <li key={name} className="live">
              <span className="step-dot" />
              <span className="step-name">{name}</span>
            </li>
          ))}
        </ol>
      </section>

      <section className="land-cta">
        <img src="/taketwo-logo.png" alt="Take Two" className="cta-logo" />
        <h2>Ready for your first take?</h2>
        <p>Log in and a sample film is waiting for you, so you can see how everything works.</p>
        <GoogleButton className="center" />
      </section>

      <footer className="land-foot">
        <span>TakeTwo PrePro is a project of the NMSU Film Club.</span>
        <a href="https://nmsufilmclub.com" target="_blank" rel="noreferrer">
          nmsufilmclub.com
        </a>
      </footer>
    </div>
  )
}
