import { useMemo, useState } from 'react'
import * as api from '../api/rcon'
import { Button, EmptyState, Panel } from '../components/ui.jsx'
import Cs2Icon from '../components/Cs2Icon.jsx'
import { avatarBackgroundStyle } from '../lib/avatars.js'

function teamLabel(team) {
  if (team === 'ct') return 'CT'
  if (team === 't') return 'T'
  return 'Spectator'
}

function money(value) {
  return value === undefined || value === null ? '—' : `$${Number(value).toLocaleString()}`
}

export default function Players({ players, onRun, onRefresh, onSelectPlayer }) {
  const [query, setQuery] = useState('')
  const [team, setTeam] = useState('all')
  const [busy, setBusy] = useState('')

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase()
    return players.filter((player) => {
      const normalizedTeam = player.team === 'ct' || player.team === 't' ? player.team : 'spec'
      const matchesTeam = team === 'all' || normalizedTeam === team
      const matchesSearch = !needle || player.name.toLowerCase().includes(needle) || String(player.userid).includes(needle)
      return matchesTeam && matchesSearch
    })
  }, [players, query, team])

  async function run(key, label, fn) {
    setBusy(key)
    try {
      await onRun(label, fn)
      await onRefresh?.({ silent: true }).catch(() => {})
    } finally {
      setBusy('')
    }
  }

  async function eachPlayer(key, label, action) {
    return run(key, label, async () => {
      for (const player of players) await action(player)
    })
  }

  return (
    <div className="page-shell">
      <div className="page-heading">
        <div><span className="page-heading__eyebrow">PLAYER ADMINISTRATION</span><h1>Players</h1><p>Manage players, teams, health, economy and moderation actions.</p></div>
        <Button onClick={() => onRefresh?.()}><Cs2Icon name="refresh" size={14} /> Refresh</Button>
      </div>

      <Panel className="players-panel">
        <div className="toolbar toolbar--players">
          <div className="toolbar__search"><span><Cs2Icon name="search" size={13} /></span><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search players or user ID…" /></div>
          <select value={team} onChange={(e) => setTeam(e.target.value)}><option value="all">All teams</option><option value="ct">CT</option><option value="t">T</option><option value="spec">Spectators</option></select>
          <div className="toolbar__spacer" />
          <span className="toolbar__count">{filtered.length} / {players.length}</span>
        </div>

        <div className="bulk-strip">
          <span>BULK ACTIONS</span>
          <Button size="sm" busy={busy === 'respawn-all'} onClick={() => eachPlayer('respawn-all', 'Respawned all players', (p) => api.respawnPlayer(p.userid))}>Respawn all</Button>
          <Button size="sm" busy={busy === 'hp100'} onClick={() => eachPlayer('hp100', 'Set all HP to 100', (p) => api.setHp(p.userid, 100))}>HP 100</Button>
          <Button size="sm" busy={busy === 'hp500'} onClick={() => eachPlayer('hp500', 'Set all HP to 500', (p) => api.setHp(p.userid, 500))}>HP 500</Button>
          <Button size="sm" busy={busy === 'freeze-all'} onClick={() => eachPlayer('freeze-all', 'Froze all players', (p) => api.freezePlayer(p.userid))}>Freeze all</Button>
          <Button size="sm" busy={busy === 'unfreeze-all'} onClick={() => eachPlayer('unfreeze-all', 'Unfroze all players', (p) => api.unfreezePlayer(p.userid))}>Unfreeze all</Button>
          <Button size="sm" busy={busy === 'money-all'} onClick={() => run('money-all', 'Set all money to $16,000', () => api.giveMoneyAll(16000))}>Max money</Button>
          <Button size="sm" busy={busy === 'strip-all'} onClick={() => eachPlayer('strip-all', 'Stripped all players', (p) => api.stripWeapons(p.userid))}>Strip all</Button>
          <Button size="sm" tone="danger" busy={busy === 'kick-all'} onClick={() => {
            if (window.confirm('Kick every connected player?')) eachPlayer('kick-all', 'Kicked all players', (p) => api.kickPlayer(p.userid))
          }}>Kick all</Button>
        </div>

        {filtered.length === 0 ? <EmptyState title="No players match your filters">Try another search or team.</EmptyState> : (
          <div className="players-table-wrap">
            <table className="players-table">
              <thead><tr><th>#</th><th>Player</th><th>Team</th><th>HP</th><th>Money</th><th>State</th><th>Ping</th><th>Actions</th></tr></thead>
              <tbody>
                {filtered.map((player, index) => (
                  <tr key={player.userid} className={player.state !== 'active' ? 'is-dead' : ''}>
                    <td>{index + 1}</td>
                    <td><button className="player-table-name" onClick={() => onSelectPlayer(player)}><span className={`player-avatar player-avatar--${player.team === 'ct' ? 'ct' : player.team === 't' ? 't' : 'spec'} ${player.avatar ? 'player-avatar--photo' : ''}`} style={player.avatar ? avatarBackgroundStyle(player) : undefined}>{player.avatar ? '' : player.name.slice(0,2).toUpperCase()}</span><span><strong>{player.name}</strong><small>#{player.userid}</small></span></button></td>
                    <td><span className={`team-badge team-badge--${player.team === 'ct' ? 'ct' : player.team === 't' ? 't' : 'spec'}`}>{teamLabel(player.team)}</span></td>
                    <td>{player.state === 'active' ? (player.hp ?? 100) : 0}</td>
                    <td>{money(player.money)}</td>
                    <td><span className={`state-pill ${player.state === 'active' ? 'state-pill--alive' : 'state-pill--dead'}`}>{player.state === 'active' ? 'Alive' : 'Dead'}</span></td>
                    <td>{player.ping || '—'}</td>
                    <td><Button size="sm" onClick={() => onSelectPlayer(player)}>Manage</Button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </div>
  )
}
