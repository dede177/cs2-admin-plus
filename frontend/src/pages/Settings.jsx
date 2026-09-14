import { Brand, Button, Panel, StatusDot } from '../components/ui.jsx'

export default function Settings({ connection, map, players, lastUpdated, error, onLogout, onRefresh }) {
  const status = connection === 'online' ? 'Connected' : connection === 'connecting' ? 'Connecting' : connection === 'stale' ? 'Stale data' : 'Offline'
  const age = lastUpdated ? Math.max(0, Math.round((Date.now() - lastUpdated) / 1000)) : null

  return (
    <div className="page-shell settings-page">
      <div className="page-heading">
        <div><span className="page-heading__eyebrow">ADMIN PLUS</span><h1>Settings</h1><p>Session, connection, and deployment information for this panel.</p></div>
      </div>

      <div className="settings-grid">
        <Panel title="Connection" subtitle="Live status of the backend and CS2 server.">
          <div className="settings-status">
            <StatusDot state={connection === 'online' ? 'online' : connection === 'connecting' ? 'warning' : 'danger'} />
            <div><strong>{status}</strong><span>{error || 'Backend API and RCON are responding.'}</span></div>
          </div>
          <dl className="settings-dl">
            <div><dt>Current map</dt><dd>{map}</dd></div>
            <div><dt>Players</dt><dd>{players.length}</dd></div>
            <div><dt>Last successful refresh</dt><dd>{age === null ? 'Never' : `${age}s ago`}</dd></div>
            <div><dt>API endpoint</dt><dd>/api</dd></div>
          </dl>
          <Button onClick={() => onRefresh?.()}>Refresh connection</Button>
        </Panel>

        <Panel title="Session" subtitle="The API secret remains in local browser storage for this session.">
          <div className="settings-brand"><Brand compact /><p>CS2 Admin Plus uses the same API-secret authentication as the existing panel.</p></div>
          <Button tone="danger" onClick={onLogout}>Log out & clear API secret</Button>
        </Panel>

        <Panel title="Architecture" subtitle="Frontend rewrite status.">
          <ul className="settings-list">
            <li><span>UI</span><strong>CS2 Themed — final mockup direction</strong></li>
            <li><span>Backend</span><strong>Existing Express API preserved</strong></li>
            <li><span>Game bridge</span><strong>Existing RCON + CounterStrikeSharp plugin</strong></li>
            <li><span>State refresh</span><strong>3-second live polling</strong></li>
          </ul>
        </Panel>
      </div>
    </div>
  )
}
