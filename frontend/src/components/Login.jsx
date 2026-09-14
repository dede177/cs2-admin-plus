import { useState } from 'react'
import { Button, Field } from './ui.jsx'
import { getStatus } from '../api/rcon'

export default function Login({ onLogin }) {
  const [secret, setSecret] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(event) {
    event.preventDefault()
    if (!secret.trim()) return
    setBusy(true)
    setError('')
    localStorage.setItem('api_secret', secret.trim())
    try {
      await getStatus()
      onLogin()
    } catch (err) {
      localStorage.removeItem('api_secret')
      setError(err?.message || 'Unable to authenticate')
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="login-screen">
      <div className="login-screen__art" />
      <section className="login-card">
        <img className="login-card__logo" src="/mockup-art/nav-logo.png" alt="CS2 Admin Plus" />
        <p className="login-card__eyebrow">SERVER CONTROL</p>
        <h1>Keep the game moving.</h1>
        <p className="login-card__copy">Connect to your CS2 Admin Plus server using the API secret configured on the backend.</p>
        <form onSubmit={submit}>
          <Field label="API secret">
            <input
              type="password"
              autoFocus
              autoComplete="current-password"
              placeholder="Enter server secret"
              value={secret}
              onChange={(e) => setSecret(e.target.value)}
            />
          </Field>
          {error && <div className="form-error">{error}</div>}
          <Button tone="primary" busy={busy} type="submit">Connect to server</Button>
        </form>
      </section>
    </main>
  )
}
