import { useState } from 'react'

export default function Login({ onLogin }) {
  const [secret, setSecret] = useState('')
  const [error, setError]   = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      localStorage.setItem('api_secret', secret)
      const res = await fetch('/health')
      // Test the secret against a real protected endpoint
      const test = await fetch('/api/players', {
        headers: { 'x-api-secret': secret }
      })
      if (test.status === 401) {
        setError('Wrong API secret.')
        localStorage.removeItem('api_secret')
        return
      }
      onLogin()
    } catch {
      setError('Could not reach backend. Is it running?')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh', background: '#0d0f12',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: "'Rajdhani', sans-serif",
    }}>
      <div style={{
        background: '#13161b', border: '1px solid #ffffff18',
        borderRadius: 12, padding: '40px 36px', width: 360,
      }}>
        <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: '0.12em', color: '#e8eaf0', marginBottom: 6 }}>
          CS2 <span style={{ color: '#ffaa00' }}>ADMIN</span> PANEL
        </div>
        <div style={{ fontSize: 13, color: '#8a909c', marginBottom: 28 }}>Enter your API secret to continue</div>

        <form onSubmit={handleSubmit}>
          <input
            type="password"
            placeholder="API Secret"
            value={secret}
            onChange={e => setSecret(e.target.value)}
            style={{
              width: '100%', fontFamily: "'Share Tech Mono', monospace",
              fontSize: 13, padding: '10px 12px', borderRadius: 8,
              border: '1px solid #ffffff18', background: '#1a1e26',
              color: '#e8eaf0', marginBottom: 12, boxSizing: 'border-box',
            }}
          />
          {error && <div style={{ color: '#ff4545', fontSize: 12, marginBottom: 12 }}>{error}</div>}
          <button
            type="submit"
            disabled={loading || !secret}
            style={{
              width: '100%', fontFamily: "'Rajdhani', sans-serif",
              fontSize: 15, fontWeight: 600, padding: '10px',
              borderRadius: 8, border: '1px solid #ffffff28',
              background: loading ? '#1a1e26' : '#20252f',
              color: loading ? '#8a909c' : '#e8eaf0',
              cursor: loading ? 'not-allowed' : 'pointer',
              letterSpacing: '0.08em',
            }}
          >
            {loading ? 'CONNECTING...' : 'CONNECT'}
          </button>
        </form>
      </div>
    </div>
  )
}
