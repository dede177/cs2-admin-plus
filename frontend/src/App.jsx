import { useEffect, useMemo, useState } from 'react'
import Login from './components/Login.jsx'
import PlayerActionDrawer from './components/PlayerActionDrawer.jsx'
import TopNav from './components/TopNav.jsx'
import Overview from './pages/Overview.jsx'
import Players from './pages/Players.jsx'
import Practice from './pages/Practice.jsx'
import Maps from './pages/Maps.jsx'
import Console from './pages/Console.jsx'
import Settings from './pages/Settings.jsx'
import { useServerStatus } from './hooks/useServerStatus.js'

const PAGES = new Set(['overview', 'players', 'maps', 'practice', 'console', 'settings'])
const DEMO_MODE = import.meta.env.VITE_DEMO_MODE === 'true'

function demoRunResult(label) {
  const command = label.startsWith('RCON: ') ? label.slice(6) : ''
  if (command === 'status') {
    return {
      result: [
        'hostname: CS2 Admin Plus Demo Server',
        'map     : de_mirage',
        'players : 12 humans, 0 bots (24 max)',
        '# userid name      state   ping',
        '# 1      jey       active  21',
        '# 6      s1mple    active  19',
        '# 11     G2TV      spec    0',
      ].join('\n'),
    }
  }
  if (command === 'css_plugins list') {
    return { result: '[01] AdminPlus 1.0.0 by dede177\n1 plugin loaded.' }
  }
  if (command === 'maps *') {
    return { result: 'de_ancient.bsp\nde_anubis.bsp\nde_dust2.bsp\nde_inferno.bsp\nde_mirage.bsp\nde_nuke.bsp\nde_vertigo.bsp' }
  }
  if (command) return { result: `[demo simulation] accepted: ${command}` }
  return { result: 'Demo simulation' }
}

function initialPage() {
  const hash = window.location.hash.replace(/^#\/?/, '')
  return PAGES.has(hash) ? hash : 'overview'
}

export default function App() {
  const [authed, setAuthed] = useState(() => DEMO_MODE || Boolean(localStorage.getItem('api_secret')))

  if (!authed) {
    return <Login onLogin={() => setAuthed(true)} />
  }

  return <AuthenticatedApp onLogout={() => setAuthed(false)} />
}

function AuthenticatedApp({ onLogout }) {
  const [page, setPage] = useState(initialPage)
  const [selectedPlayer, setSelectedPlayer] = useState(null)
  const [activity, setActivity] = useState([])
  const server = useServerStatus(3000)

  useEffect(() => {
    const onHash = () => setPage(initialPage())
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  useEffect(() => {
    if (!selectedPlayer) return
    const fresh = server.players.find((player) => String(player.userid) === String(selectedPlayer.userid))
    if (fresh) setSelectedPlayer(fresh)
  }, [server.players, selectedPlayer?.userid])

  function navigate(next) {
    if (!PAGES.has(next)) return
    window.location.hash = `/${next}`
    setPage(next)
  }

  function pushActivity(label, status, detail = '') {
    const entry = { id: `${Date.now()}-${Math.random().toString(36).slice(2)}`, time: Date.now(), label, status, detail }
    setActivity((prev) => [entry, ...prev].slice(0, 100))
  }

  async function run(label, fn) {
    try {
      const result = DEMO_MODE ? demoRunResult(label) : await fn()
      pushActivity(label, 'success')
      return result
    } catch (error) {
      const message = error?.message || 'Command failed'
      pushActivity(label, 'error', message)
      throw error
    }
  }

  function logout() {
    localStorage.removeItem('api_secret')
    onLogout()
  }

  const pageContent = useMemo(() => {
    const common = { onRun: run }
    switch (page) {
      case 'players':
        return <Players players={server.players} onRun={run} onRefresh={server.refresh} onSelectPlayer={setSelectedPlayer} />
      case 'maps':
        return <Maps currentMap={server.map} {...common} />
      case 'practice':
        return <Practice {...common} />
      case 'console':
        return <Console activity={activity} {...common} />
      case 'settings':
        return <Settings connection={server.connection} map={server.map} players={server.players} lastUpdated={server.lastUpdated} error={server.error} onLogout={logout} onRefresh={server.refresh} />
      case 'overview':
      default:
        return <Overview players={server.players} map={server.map} meta={server.meta} connection={server.connection} lastUpdated={server.lastUpdated} onRun={run} onRefresh={server.refresh} onSelectPlayer={setSelectedPlayer} onNavigate={navigate} />
    }
  }, [page, server.players, server.map, server.meta, server.connection, server.lastUpdated, server.error, server.refresh, activity])

  return (
    <div className="app-shell">
      <TopNav active={page} onNavigate={navigate} connection={server.connection} map={server.map} players={server.players} meta={server.meta} onRefresh={() => server.refresh().catch(() => {})} />

      {!DEMO_MODE && server.error && (
        <div className={`connection-banner connection-banner--${server.lastUpdated ? 'stale' : 'offline'}`}>
          <strong>{server.lastUpdated ? 'Server data may be stale.' : 'Unable to reach the server.'}</strong>
          <span>{server.error}</span>
          <button onClick={() => server.refresh().catch(() => {})}>Retry</button>
        </div>
      )}

      <main className="app-content">{pageContent}</main>

      {selectedPlayer && (
        <PlayerActionDrawer
          player={selectedPlayer}
          onClose={() => setSelectedPlayer(null)}
          onRun={run}
          onRefresh={server.refresh}
        />
      )}
    </div>
  )
}
