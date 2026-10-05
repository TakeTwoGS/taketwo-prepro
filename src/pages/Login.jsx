import { useState } from 'react'
import { supabase } from '../lib/supabase.js'

export default function Login() {
  const [mode, setMode] = useState('login') // login | signup | forgot
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')

  function switchMode(m) {
    setMode(m)
    setError('')
    setInfo('')
  }

  async function submit(e) {
    e.preventDefault()
    setError('')
    setInfo('')
    setBusy(true)
    try {
      if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
        if (error) throw error
      } else if (mode === 'signup') {
        if (password.length < 8) throw new Error('Use a password with at least 8 characters.')
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: { emailRedirectTo: window.location.origin },
        })
        if (error) throw error
        if (!data.session) setInfo('Check your email for a confirmation link, then come back and log in.')
      } else {
        const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
          redirectTo: window.location.origin + '/reset-password',
        })
        if (error) throw error
        setInfo('If that email has an account, a reset link is on its way.')
      }
    } catch (err) {
      setError(err.message || 'Something went wrong. Try again.')
    } finally {
      setBusy(false)
    }
  }

  const title = mode === 'login' ? 'Log in' : mode === 'signup' ? 'Create your account' : 'Reset your password'
  const cta = mode === 'login' ? 'Log in' : mode === 'signup' ? 'Create account' : 'Send reset link'

  return (
    <div className="center-screen">
      <form className="auth-card" onSubmit={submit}>
        <div className="brand-mark">TakeTwo PrePro</div>
        <p className="tagline">Everything you need to take a film from an idea to the set.</p>
        <h1 className="auth-title">{title}</h1>

        <label className="label" htmlFor="email">
          Email
        </label>
        <input
          id="email"
          className="input"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        {mode !== 'forgot' && (
          <>
            <label className="label" htmlFor="password">
              Password
            </label>
            <input
              id="password"
              className="input"
              type="password"
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </>
        )}

        {error && <div className="notice error">{error}</div>}
        {info && <div className="notice ok">{info}</div>}

        <button className="btn btn-primary btn-block" disabled={busy}>
          {busy ? 'One moment…' : cta}
        </button>

        <div className="auth-links">
          {mode === 'login' && (
            <>
              <button type="button" className="link-btn" onClick={() => switchMode('forgot')}>
                Forgot your password?
              </button>
              <button type="button" className="link-btn" onClick={() => switchMode('signup')}>
                Create an account
              </button>
            </>
          )}
          {mode !== 'login' && (
            <button type="button" className="link-btn" onClick={() => switchMode('login')}>
              Back to log in
            </button>
          )}
        </div>
      </form>
    </div>
  )
}
