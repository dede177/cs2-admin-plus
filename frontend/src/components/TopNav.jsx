import { Brand, StatusDot } from './ui.jsx'
import Cs2Icon from './Cs2Icon.jsx'

const NAV = [
  ['overview', 'home', 'Dashboard'],
  ['players', 'player', 'Players'],
  ['maps', 'votechangelevel', 'Maps'],
  ['practice', 'crosshair', 'Practice'],
  ['console', 'servers', 'Console'],
  ['settings', 'settings', 'Settings'],
]

export default function TopNav({ active, onNavigate, connection, map, players, meta = {}, onRefresh }) {
  const statusLabel = connection === 'online'
    ? 'Server Online'
    : connection === 'connecting'
      ? 'Connecting…'
      : connection === 'stale'
        ? 'Data Stale'
        : 'Server Offline'

  const secondary = meta.endpoint || (map !== 'unknown' ? map : `${players.length} players`)

  return (
    <header className="topnav">
      <button className="topnav__brand" onClick={() => onNavigate('overview')} aria-label="Open dashboard">
        <Brand compact />
      </button>
      <nav className="topnav__links" aria-label="Primary navigation">
        {NAV.map(([id, icon, label]) => (
          <button
            key={id}
            className={`topnav__link ${active === id ? 'is-active' : ''}`}
            onClick={() => onNavigate(id)}
          >
            <span className="topnav__icon"><Cs2Icon name={icon} size={14} /></span>
            <span>{label}</span>
          </button>
        ))}
      </nav>
      <div className="topnav__server-wrap">
        <button className="topnav__server" onClick={onRefresh} title="Refresh server status">
          <StatusDot state={connection === 'online' ? 'online' : connection === 'connecting' ? 'warning' : 'danger'} />
          <span className="topnav__server-copy">
            <strong>{statusLabel}</strong>
            <small>{secondary}</small>
          </span>
        </button>
        <button className="topnav__more" aria-label="Server menu"><Cs2Icon name="moreoptions" size={15} /></button>
      </div>
    </header>
  )
}
