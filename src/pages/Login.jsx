import { Link } from 'react-router-dom'
import GoogleButton from '../components/GoogleButton.jsx'
import Logo from '../components/Logo.jsx'

export default function Login() {
  return (
    <div className="center-screen">
      <div className="auth-card">
        <div className="auth-logo"><Logo to="/" size="lg" /></div>
        <p className="tagline">Everything you need to take a film from an idea to the set.</p>
        <h1 className="auth-title">Log in or sign up</h1>
        <p className="muted-text">Use your Google account. New here? An account is created the first time you log in.</p>
        <GoogleButton />
        <div className="auth-links">
          <Link className="link-btn" to="/">
            Back to the home page
          </Link>
        </div>
      </div>
    </div>
  )
}
