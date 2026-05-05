import { useState, useCallback } from 'react'
import * as api from '../api/rcon'
import WeaponMenu from './WeaponMenu'
import MoneyInput from './MoneyInput'
import HpInput from './HpInput'
import SlapInput from './SlapInput'

export default function PlayerCard({ player, team, onLog }) {
  const [hover, setHover]       = useState(false)
  const [dragging, setDragging] = useState(false)
  const [frozen, setFrozen]     = useState(false)
  const [god, setGod]           = useState(false)
  const [busy, setBusy]         = useState(false)

  const dead     = player.state !== 'active'
  const initials = player.name.slice(0, 2).toUpperCase()
  const teamColor  = team === 'ct' ? '#4a9eff' : '#ffaa00'
  const teamBg     = team === 'ct' ? '#4a9eff18' : '#ffaa0018'
  const teamBorder = team === 'ct' ? '#4a9eff28' : '#ffaa0028'

  const action = useCallback(async (label, fn) => {
    if (busy) return
    setBusy(true)
    try { await fn(); if (onLog) onLog(`✓ ${label} → ${player.name}`) }
    catch (e) { if (onLog) onLog(`✗ ${label} failed: ${e.message}`) }
    finally { setBusy(false) }
  }, [busy, player.name, onLog])

  function handleDragStart(e) {
    setDragging(true)
    setHover(false)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('userid', player.userid)
    e.dataTransfer.setData('fromTeam', team)
  }

  function handleDragEnd() {
    setDragging(false)
    setHover(false)
  }

  const showActions = hover && !dragging

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onMouseEnter={() => { if (!dragging) setHover(true) }}
      onMouseLeave={() => setHover(false)}
      style={{
        background: dragging ? '#0d0f12' : hover ? '#20252f' : '#1a1e26',
        border: `1px solid ${dragging ? teamColor + '50' : hover ? '#ffffff28' : '#ffffff0f'}`,
        borderRadius: 8, padding: '10px 12px',
        opacity: dragging ? 0.35 : dead ? 0.45 : 1,
        cursor: dragging ? 'grabbing' : 'grab',
        transition: 'background .15s, border-color .15s, opacity .15s',
        fontFamily: "'Rajdhani', sans-serif",
        userSelect: 'none',
      }}
    >
      {/* Top row */}
      <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:9 }}>
        <div style={{ display:'flex', flexDirection:'column', gap:2.5, opacity: hover && !dragging ? 0.35 : 0, transition:'opacity .15s', flexShrink:0, width:12 }}>
          {[0,1,2].map(i => <div key={i} style={{ width:12, height:2, background:teamColor, borderRadius:1 }} />)}
        </div>
        <div style={{
          width:34, height:34, borderRadius:6, flexShrink:0,
          display:'flex', alignItems:'center', justifyContent:'center',
          fontSize:12, fontWeight:700,
          background: dead ? '#ffffff08' : teamBg,
          color: dead ? '#454a54' : teamColor,
          border: `1px solid ${dead ? '#ffffff0f' : teamBorder}`,
        }}>
          {initials}
        </div>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ display:'flex', alignItems:'center', gap:6 }}>
            <div style={{ fontSize:14, fontWeight:600, color: dead ? '#454a54' : '#e8eaf0', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
              {player.name}
            </div>
            {frozen && <Badge color="#4a9eff">FROZEN</Badge>}
            {god    && <Badge color="#ffaa00">GOD</Badge>}
          </div>
          <div style={{ display:'flex', gap:8, marginTop:2, alignItems:'center' }}>
            {dead
              ? <span style={{ fontSize:10, fontWeight:700, letterSpacing:'0.12em', color:'#ff4545' }}>✕ DEAD</span>
              : <span style={{ fontSize:11, fontFamily:"'Share Tech Mono',monospace", color:'#8a909c' }}>
                  {player.isBot ? 'BOT' : `ping ${player.ping}ms`}
                </span>
            }
            {player.money !== undefined &&
              <span style={{ fontSize:11, fontFamily:"'Share Tech Mono',monospace", color: player.money > 3000 ? '#4cff91' : player.money > 1000 ? '#ffaa00' : '#ff4545' }}>
                ${player.money?.toLocaleString()}
              </span>
            }
          </div>
        </div>
      </div>

      {/* HP bar */}
      <div style={{ display:'flex', alignItems:'center', gap:8 }}>
        <div style={{ flex:1, height:4, background:'#ffffff0a', borderRadius:2, overflow:'hidden' }}>
          <div style={{
            height:'100%', borderRadius:2,
            width: `${dead ? 0 : (player.hp || 100)}%`,
            background: (player.hp||100) > 60 ? '#4cff91' : (player.hp||100) > 30 ? '#ffaa00' : '#ff4545',
            transition: 'width .3s',
          }} />
        </div>
        <div style={{ fontSize:11, fontFamily:"'Share Tech Mono',monospace", color:'#8a909c', minWidth:24, textAlign:'right' }}>
          {dead ? 0 : (player.hp ?? 100)}
        </div>
      </div>

      {/* Actions */}
      {showActions && (
        <div style={{ marginTop:9 }} onMouseDown={e => e.stopPropagation()}>
          {/* Row 1 — primary */}
          <div style={{ display:'flex', gap:4, flexWrap:'wrap', alignItems:'center', marginBottom:4 }}>
            <Btn green onClick={() => action('Respawn', () => api.respawnPlayer(player.userid))}>RESPAWN</Btn>
            <MoneyInput onGive={amt  => action(`Give $${amt}`,   () => api.giveMoney(player.userid, amt))} />
            <WeaponMenu onSelect={w  => action(`Give ${w}`,      () => api.giveWeapon(player.userid, w))} />
            <HpInput    onSet={hp    => action(`Set HP ${hp}`,   () => api.setHp(player.userid, hp))} />
          </div>
          {/* Row 2 — utility */}
          <div style={{ display:'flex', gap:4, flexWrap:'wrap', alignItems:'center' }}>
            <Btn toggle={frozen} onClick={() => {
              if (frozen) {
                action('Unfreeze', () => api.unfreezePlayer(player.userid))
                setFrozen(false)
              } else {
                action('Freeze', () => api.freezePlayer(player.userid))
                setFrozen(true)
              }
            }}>{frozen ? 'UNFREEZE' : 'FREEZE'}</Btn>
            <Btn toggle={god} onClick={() => {
              action('God mode', () => api.godMode(player.userid))
              setGod(g => !g)
            }}>{god ? 'GOD ✓' : 'GOD'}</Btn>
            <Btn onClick={() => action('Strip weapons', () => api.stripWeapons(player.userid))}>STRIP</Btn>
            <SlapInput onSlap={dmg => action(`Slap ${dmg}dmg`, () => api.slapPlayer(player.userid, dmg))} />
            <Btn onClick={() => action('Move team', () => api.setTeam(player.userid, team === 'ct' ? 't' : 'ct'))}>MOVE</Btn>
            <Btn red onClick={() => action('Kick', () => api.kickPlayer(player.userid))}>KICK</Btn>
          </div>
        </div>
      )}
    </div>
  )
}

function Btn({ children, onClick, red, green, toggle }) {
  return (
    <button onClick={onClick} onMouseDown={e => e.stopPropagation()} style={{
      fontFamily:"'Share Tech Mono',monospace", fontSize:10,
      padding:'4px 8px', borderRadius:4, cursor:'pointer',
      border:`1px solid ${red ? '#ff454530' : green ? '#4cff9130' : toggle ? '#4a9eff40' : '#ffffff28'}`,
      background: toggle ? '#4a9eff10' : 'transparent',
      color: red ? '#ff4545' : green ? '#4cff91' : toggle ? '#4a9eff' : '#8a909c',
      letterSpacing:'0.06em',
    }}>
      {children}
    </button>
  )
}

function Badge({ children, color }) {
  return (
    <span style={{
      fontSize:9, fontWeight:700, letterSpacing:'0.1em',
      padding:'2px 5px', borderRadius:3,
      border:`1px solid ${color}40`, background:`${color}15`,
      color, fontFamily:"'Share Tech Mono',monospace",
    }}>
      {children}
    </span>
  )
}
