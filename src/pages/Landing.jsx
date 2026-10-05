import { Link, Navigate } from 'react-router-dom'
import GoogleButton from '../components/GoogleButton.jsx'
import { useAuth } from '../lib/auth.jsx'

export default function Landing() {
  const { user, loading } = useAuth()
  if (!loading && user) return <Navigate to="/home" replace />

  return (
    <div className="landing">
      <header className="land-head">
        <Link to="/" className="brand">
          <span className="brand-dot" aria-hidden="true" />
          TakeTwo PrePro
        </Link>
        <Link to="/login" className="btn btn-ghost btn-sm">
          Log in
        </Link>
      </header>

      <section className="land-hero">
        <div className="land-copy">
          <h1>Take your film from an idea to the set.</h1>
          <p>
            A simple, free workspace for student and independent filmmakers. Write your script, see your scenes organize
            themselves, and keep everything for your film in one place.
          </p>
          <GoogleButton className="left" />
          <small className="land-note">Free to use. You log in with your Google account.</small>
        </div>

        <div className="land-sheet" aria-hidden="true">
          <div className="ls-scene">INT. DINER - NIGHT</div>
          <div className="ls-action">Rain on the glass. MAYA (30s) stirs a coffee that went cold an hour ago.</div>
          <div className="ls-char">MAYA</div>
          <div className="ls-paren">(quietly)</div>
          <div className="ls-dialogue">He said he would be here by nine.</div>
          <div className="ls-action">The bell over the door rings. It is only the wind.</div>
        </div>
      </section>

      <section className="land-features">
        <div>
          <h2>Write in real screenplay format</h2>
          <p>Press Enter and Tab to move between scene headings, action, and dialogue. The formatting takes care of itself.</p>
        </div>
        <div>
          <h2>Your scenes build themselves</h2>
          <p>Every scene heading becomes a scene with its location, time of day, and characters. Drag scenes to reorder them.</p>
        </div>
        <div>
          <h2>Learn as you go</h2>
          <p>Beginner mode explains filmmaking terms in plain language, right where you meet them.</p>
        </div>
      </section>
    </div>
  )
}
