import { useEffect, useRef, useState } from 'react'
import { Button, Field } from './ui.jsx'
import { getStatus } from '../api/rcon'

const LOGIN_BACKGROUNDS = [
  {
    src: '/login-backgrounds/mirage.webp',
    position: '56% 50%',
    mobilePosition: '54% 50%',
    motion: { '--scene-start-x': '4px', '--scene-start-y': '2px', '--scene-end-x': '-10px', '--scene-end-y': '-4px', '--scene-start-scale': '1.018', '--scene-end-scale': '1.048' },
  },
  {
    src: '/login-backgrounds/nuke.webp',
    position: '52% 51%',
    mobilePosition: '50% 50%',
    motion: { '--scene-start-x': '0px', '--scene-start-y': '4px', '--scene-end-x': '-3px', '--scene-end-y': '-8px', '--scene-start-scale': '1.018', '--scene-end-scale': '1.045' },
  },
  {
    src: '/login-backgrounds/overpass.webp',
    position: '51% 47%',
    mobilePosition: '49% 48%',
    motion: { '--scene-start-x': '7px', '--scene-start-y': '2px', '--scene-end-x': '-10px', '--scene-end-y': '-4px', '--scene-start-scale': '1.02', '--scene-end-scale': '1.045' },
  },
  {
    src: '/login-backgrounds/ancient.webp',
    position: '54% 48%',
    mobilePosition: '52% 48%',
    motion: { '--scene-start-x': '5px', '--scene-start-y': '3px', '--scene-end-x': '-8px', '--scene-end-y': '-7px', '--scene-start-scale': '1.018', '--scene-end-scale': '1.05' },
  },
]

const BACKGROUND_HOLD_MS = 8500
const BACKGROUND_CROSSFADE_MS = 2800

export default function Login({ onLogin }) {
  const [secret, setSecret] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [activeBackground, setActiveBackground] = useState(null)
  const [previousBackground, setPreviousBackground] = useState(null)
  const [readyBackgrounds, setReadyBackgrounds] = useState(() => LOGIN_BACKGROUNDS.map(() => false))
  const [reducedMotion, setReducedMotion] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches)
  const fadeCleanupRef = useRef(null)

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)')
    const onMotionPreferenceChange = () => setReducedMotion(media.matches)
    media.addEventListener?.('change', onMotionPreferenceChange)
    return () => media.removeEventListener?.('change', onMotionPreferenceChange)
  }, [])

  useEffect(() => {
    const ready = readyBackgrounds.flatMap((isReady, index) => (isReady ? [index] : []))
    if (!ready.length) return

    if (reducedMotion) {
      setPreviousBackground(null)
      if (activeBackground !== ready[0]) setActiveBackground(ready[0])
      return
    }

    if (!readyBackgrounds[activeBackground]) {
      setActiveBackground(ready[0])
      return
    }

    if (ready.length < 2) return
    const timeout = window.setTimeout(() => {
      setActiveBackground((current) => {
        const currentIndex = ready.indexOf(current)
        const next = ready[(currentIndex + 1) % ready.length]
        setPreviousBackground(current)
        if (fadeCleanupRef.current) window.clearTimeout(fadeCleanupRef.current)
        fadeCleanupRef.current = window.setTimeout(() => {
          setPreviousBackground((previous) => (previous === current ? null : previous))
          fadeCleanupRef.current = null
        }, BACKGROUND_CROSSFADE_MS + 160)
        return next
      })
    }, BACKGROUND_HOLD_MS)
    return () => window.clearTimeout(timeout)
  }, [activeBackground, readyBackgrounds, reducedMotion])

  useEffect(() => () => {
    if (fadeCleanupRef.current) window.clearTimeout(fadeCleanupRef.current)
  }, [])

  function markBackgroundReady(index, image) {
    const finish = () => {
      setReadyBackgrounds((current) => {
        if (current[index]) return current
        const next = [...current]
        next[index] = true
        return next
      })
    }

    if (typeof image.decode === 'function') {
      image.decode().then(finish).catch(() => {})
    } else {
      finish()
    }
  }

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
      <div className="login-screen__art" aria-hidden="true">
        <div className="login-screen__backdrops">
          {LOGIN_BACKGROUNDS.map(({ src, position, mobilePosition, motion }, index) => {
            const isActive = index === activeBackground
            const isLeaving = index === previousBackground
            return (
              <img
                key={src}
                className={`login-screen__backdrop ${isActive ? 'is-active' : ''} ${isLeaving ? 'is-leaving' : ''}`}
                src={src}
                alt=""
                decoding="async"
                fetchPriority={index === 0 ? 'high' : 'auto'}
                style={{ '--scene-position': position, '--scene-mobile-position': mobilePosition, ...motion }}
                onLoad={(event) => markBackgroundReady(index, event.currentTarget)}
                onError={() => {
                  setReadyBackgrounds((current) => {
                    if (!current[index]) return current
                    const next = [...current]
                    next[index] = false
                    return next
                  })
                }}
              />
            )
          })}
        </div>
        <div className="login-screen__veil" />
        <div className="login-screen__grid" />
        <div className="login-hero-copy">
          <span className="login-hero-copy__line login-hero-copy__line--one">CONTROL YOUR SERVER.</span>
          <span className="login-hero-copy__line login-hero-copy__line--two">KEEP THE GAME MOVING.</span>
          <span className="login-hero-copy__accent" />
        </div>
      </div>
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
