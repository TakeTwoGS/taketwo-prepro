import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase.js'
import { useAuth } from '../lib/auth.jsx'

export default function ResetPassword() {
  const { loading, user } = useAuth()
  const nav = useNavigate()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function submit(e) {
    e.preventDefault()
    setError('')
    if (password.length < 8) return setError('Use a password with at least 8 characters.')
    if (password !== confirm) return setError('The two passwords do not match.')
    setBusy(true)
    const { error } = await supabase.auth.updateUser({ password })
    setBusy(false)
    if (error) return setError(error.message)
    nav('/', { replace: true })
  }

  return (
    <div className="center-screen">
      <form className="auth-card" onSubmit={submit}>
        <div className="brand-mark">TakeTwo PrePro</div>
        <h1 className="auth-title">Choose a new password</h1>
        {loading ? (
          <p className="muted-text">Checking your link…</p>
        ) : !user ? (
          <>
            <p className="muted-text">This reset link has expired or was already used. Request a new one from the log in page.</p>
            <Link className="btn btn-primary btn-block" to="/login">
              Go to log in
            </Link>
          </>
        ) : (
          <>
            <label className="label" htmlFor="pw1">
              New password
            </label>
            <input id="pw1" className="input" type="password" autoComplete="new-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
            <label className="label" htmlFor="pw2">
              Confirm new password
            </label>
            <input id="pw2" className="input" type="password" autoComplete="new-password" required value={confirm} onChange={(e) => setConfirm(e.target.value)} />
            {error && <div className="notice error">{error}</div>}
            <button className="btn btn-primary btn-block" disabled={busy}>
              {busy ? 'Saving…' : 'Save new password'}
            </button>
          </>
        )}
      </form>
    </div>
  )
}
