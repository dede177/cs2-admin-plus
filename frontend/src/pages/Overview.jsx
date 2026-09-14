import { useMemo, useState } from 'react'
import * as api from '../api/rcon'
import { SpectatorTray, TeamTable } from '../components/PlayerRows.jsx'
import { Button, StatusDot } from '../components/ui.jsx'
import Cs2Icon from '../components/Cs2Icon.jsx'
import { mapBackgroundFor, mapIconFor } from '../lib/mapAssets.js'

function titleForMap(map) {
  return map === 'unknown'
    ? 'Waiting for server'
    : String(map).replace(/^de_/, '').replace(/^cs_/, '').replace(/(^|_)(\w)/g, (_, p, c) => `${p ? ' ' : ''}${c.toUpperCase()}`)
}

export default function Overview({ players, map, meta = {}, connection, onRun, onRefresh, onSelectPlayer, onNavigate }) {
  const [busy, setBusy] = useState('')
  const [dragOver, setDragOver] = useState(null)

  const teams = useMemo(() => {
    const ct = []
    const t = []
    const spec = []
    for (const player of players) {
      if (player.team === 'ct') ct.push(player)
      else if (player.team === 't') t.push(player)
      else spec.push(player)
    }
    return { ct, t, spec }
  }, [players])

  async function run(key, label, fn) {
    setBusy(key)
    try {
      await onRun(label, fn)
      await onRefresh?.({ silent: true }).catch(() => {})
    } finally {
      setBusy('')
    }
  }

  async function movePlayer(userid, team) {
    const player = players.find((item) => String(item.userid) === String(userid))
    if (!player) return
    await run(`move-${userid}`, `Moved ${player.name} to ${team.toUpperCase()}`, () => api.setTeam(userid, team))
  }

  const statusLabel = connection === 'online' ? 'Server Online' : connection === 'stale' ? 'Connection Degraded' : connection === 'connecting' ? 'Connecting' : 'Server Offline'
  const scoreCt = meta.score?.ct ?? '—'
  const scoreT = meta.score?.t ?? '—'

  return (
    <div className="overview-page">
      <section className="map-hero" style={{ backgroundImage: `url(${mapBackgroundFor(map)})` }}>
        <div className="map-hero__shade" />
        {map === 'de_mirage' && <img className="map-hero__graffiti" src="/mockup-art/hero-graffiti.png" alt="" />}
        <div className="map-hero__current">
          <img className="map-hero__badge" src={mapIconFor(map)} alt="" aria-hidden="true" />
          <div className="map-hero__copy">
            <span className="map-hero__eyebrow">CURRENT MAP</span>
            <h1>{titleForMap(map)}</h1>
            <div className="map-hero__meta">
              <code>{map}</code>
              <button onClick={() => onNavigate?.('maps')}><Cs2Icon name="votechangelevel" size={13} /> Change Map</button>
            </div>
          </div>
        </div>
        <div className="server-card">
          <div className="server-card__title">
            <StatusDot state={connection === 'online' ? 'online' : connection === 'connecting' ? 'warning' : 'danger'} />
            <div><strong>{statusLabel}</strong><small>{meta.endpoint || 'RCON bridge'}</small></div>
          </div>
          <div className="server-card__stats">
            <div><span>Players</span><strong>{meta.playerCount ?? players.length} / 24</strong></div>
            <div><span>Map</span><strong>{map === 'unknown' ? '—' : titleForMap(map)}</strong></div>
            <div><span>Next Map</span><strong className="server-card__raw">{meta.nextMap || '—'}</strong></div>
            <div><span>Tickrate</span><strong>{meta.tickrate ?? '—'}</strong></div>
          </div>
        </div>
      </section>

      <section className="match-board">
        <div className="match-board__team">
          <TeamTable
            team="ct"
            title="COUNTER-TERRORISTS"
            players={teams.ct}
            onSelect={onSelectPlayer}
            onDropPlayer={movePlayer}
            dragOver={dragOver}
            onDragState={setDragOver}
          />
          <SpectatorTray
            players={teams.spec}
            onSelect={onSelectPlayer}
            onDropPlayer={movePlayer}
            dragOver={dragOver}
            onDragState={setDragOver}
          />
        </div>

        <div className="match-controls">
          <div className="score-strip">
            <span className="score-strip__round">ROUND {meta.round ?? '—'} / {meta.maxRounds ?? '—'}</span>
            <div>
              <strong className="score-strip__ct">CT</strong>
              <strong className="score-strip__ct score-strip__number">{scoreCt}</strong>
              <span>:</span>
              <strong className="score-strip__t score-strip__number">{scoreT}</strong>
              <strong className="score-strip__t">T</strong>
            </div>
            <small>{meta.firstTo ? `First to ${meta.firstTo}` : 'Live match controls'}</small>
          </div>
          <div className="match-controls__stack">
            <Button className="match-control-button" busy={busy === 'restart'} onClick={() => run('restart', 'Restarted round', () => api.sendRcon('mp_restartgame 1'))}><span className="control-icon"><Cs2Icon name="refresh" size={22} /></span><span className="control-label">Restart Round</span><span className="control-balance" aria-hidden="true" /></Button>
            <Button className="match-control-button" busy={busy === 'pause'} onClick={() => run('pause', 'Paused match', () => api.sendRcon('mp_pause_match'))}><span className="control-icon"><Cs2Icon name="votepausematch" size={21} /></span><span className="control-label">Pause Match</span><span className="control-balance" aria-hidden="true" /></Button>
            <Button className="match-control-button" busy={busy === 'swap'} onClick={() => run('swap', 'Swapped teams', () => api.sendRcon('mp_swapteams'))}><span className="control-icon"><Cs2Icon name="votescrambleteams" size={22} /></span><span className="control-label">Swap Teams</span><span className="control-balance" aria-hidden="true" /></Button>
            <Button className="match-control-button" tone="accent" busy={busy === 'warmup'} onClick={() => run('warmup', 'Started infinite warmup', () => api.sendRcon('mp_warmuptime 999999; mp_warmup_pausetimer 1; mp_warmup_start'))}><span className="control-icon"><Cs2Icon name="hot_trend" size={22} /></span><span className="control-label">Warmup (Infinite)</span><span className="control-balance" aria-hidden="true" /></Button>
            <Button busy={busy === 'endwarmup'} onClick={() => run('endwarmup', 'Ended warmup', () => api.sendRcon('mp_warmup_pausetimer 0; mp_warmup_end'))}>End Warmup</Button>
          </div>
        </div>

        <div className="match-board__team">
          <TeamTable
            team="t"
            title="TERRORISTS"
            players={teams.t}
            onSelect={onSelectPlayer}
            onDropPlayer={movePlayer}
            dragOver={dragOver}
            onDragState={setDragOver}
          />
        </div>
      </section>
    </div>
  )
}
