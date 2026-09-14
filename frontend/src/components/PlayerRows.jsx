import { IconButton } from './ui.jsx'
import Cs2Icon from './Cs2Icon.jsx'
import { avatarBackgroundStyle } from '../lib/avatars.js'

function money(value) {
  return value === undefined || value === null ? '—' : `$${Number(value).toLocaleString()}`
}

function avatar(player, teamClass) {
  if (player.avatar) {
    return <span className={`player-avatar player-avatar--${teamClass} player-avatar--photo`} style={avatarBackgroundStyle(player)} />
  }
  return <span className={`player-avatar player-avatar--${teamClass}`}>{player.name.slice(0, 2).toUpperCase()}</span>
}

export function TeamTable({ team, players, title, onSelect, onDropPlayer, dragOver, onDragState }) {
  const teamClass = team === 'ct' ? 'ct' : team === 't' ? 't' : 'spec'
  const showScoreStats = players.some((player) => player.kills !== undefined || player.assists !== undefined || player.deaths !== undefined || player.hsp !== undefined)

  function dragStart(event, player) {
    event.dataTransfer.effectAllowed = 'move'
    event.dataTransfer.setData('text/player-id', player.userid)
    event.dataTransfer.setData('text/player-team', player.team || 'spec')
    onDragState?.(team)
  }

  function drop(event) {
    event.preventDefault()
    const userid = event.dataTransfer.getData('text/player-id')
    const from = event.dataTransfer.getData('text/player-team')
    onDragState?.(null)
    if (userid && from !== team) onDropPlayer?.(userid, team)
  }

  return (
    <section
      className={`team-card team-card--${teamClass} ${dragOver === team ? 'is-drop-target' : ''}`}
      onDragOver={(event) => { event.preventDefault(); onDragState?.(team) }}
      onDragLeave={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) onDragState?.(null) }}
      onDrop={drop}
    >
      <header className="team-card__header">
        <div className="team-card__identity">
          <span className="team-card__symbol" aria-hidden="true">
            <img
              src={team === 'ct' ? '/team-logos/ct_logo.svg' : '/team-logos/t_logo.svg'}
              alt=""
            />
          </span>
          <strong>{title} <span>({players.length})</span></strong>
        </div>
      </header>
      <div className={`team-table ${showScoreStats ? 'team-table--score' : 'team-table--server'}`} role="table" aria-label={title}>
        <div className="team-table__head" role="row">
          {showScoreStats
            ? <><span>#</span><span>Player</span><span>K</span><span>A</span><span>D</span><span>HSP</span><span /></>
            : <><span>#</span><span>Player</span><span>HP</span><span>Money</span><span>State</span><span /></>}
        </div>
        {players.length === 0 ? (
          <div className="team-table__empty">Drag a player here</div>
        ) : players.map((player, index) => (
          <div
            className={`team-table__row ${player.state !== 'active' ? 'is-dead' : ''}`}
            role="row"
            draggable
            key={player.userid}
            onDragStart={(event) => dragStart(event, player)}
            onDragEnd={() => onDragState?.(null)}
            onDoubleClick={() => onSelect?.(player)}
          >
            <span className="team-table__index">{index + 1}</span>
            <button className="player-cell" onClick={() => onSelect?.(player)}>
              {avatar(player, teamClass)}
              <span className="player-cell__name">{player.name}</span>
            </button>
            {showScoreStats ? (
              <>
                <span>{player.kills ?? '—'}</span>
                <span>{player.assists ?? '—'}</span>
                <span>{player.deaths ?? '—'}</span>
                <span>{player.hsp ?? '—'}</span>
                <IconButton label={`Manage ${player.name}`} onClick={() => onSelect?.(player)} />
              </>
            ) : (
              <>
                <span>{player.state === 'active' ? (player.hp ?? 100) : 0}</span>
                <span className="team-table__money">{money(player.money)}</span>
                <span className={`state-pill ${player.state === 'active' ? 'state-pill--alive' : 'state-pill--dead'}`}>
                  {player.state === 'active' ? 'Alive' : 'Dead'}
                </span>
                <IconButton label={`Manage ${player.name}`} onClick={() => onSelect?.(player)} />
              </>
            )}
          </div>
        ))}
      </div>
    </section>
  )
}

export function SpectatorTray({ players, onSelect, onDropPlayer, dragOver, onDragState }) {
  return (
    <section
      className={`spectator-tray ${dragOver === 'spec' ? 'is-drop-target' : ''}`}
      onDragOver={(e) => { e.preventDefault(); onDragState?.('spec') }}
      onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) onDragState?.(null) }}
      onDrop={(e) => {
        e.preventDefault()
        const userid = e.dataTransfer.getData('text/player-id')
        const from = e.dataTransfer.getData('text/player-team')
        onDragState?.(null)
        if (userid && from !== 'spec') onDropPlayer?.(userid, 'spec')
      }}
    >
      <header><strong>SPECTATORS ({players.length})</strong></header>
      <div className="spectator-tray__list">
        {players.length === 0 ? <span className="spectator-tray__empty">Drop players here</span> : players.map((player) => (
          <button key={player.userid} className="spectator-chip" onClick={() => onSelect?.(player)}>
            {avatar(player, 'spec')}
            <span>{player.name}</span>
          </button>
        ))}
        {players.length > 0 && <span className="spectator-tray__more" aria-hidden="true"><Cs2Icon name="moreoptions" size={14} /></span>}
      </div>
    </section>
  )
}
