import { useEffect, useState } from 'react'
import { useServerStatus } from './hooks/useServerStatus'
import PlayerCard from './components/PlayerCard'
import Login from './components/Login'
import * as api from './api/rcon'
import RoundControls from './components/RoundControls'
import AdminControls from './components/AdminControls'

const DEFAULT_MAPS = ['de_dust2','de_mirage','de_inferno','de_nuke','de_ancient','de_vertigo','de_anubis']
const WEAPONS = ['ak47','m4a4','awp','deagle','mp9','famas','sg553','aug','m4a1_silencer']

export default function App() {
  const [authed, setAuthed]           = useState(!!localStorage.getItem('api_secret'))
  const [moneyAmt, setMoneyAmt]       = useState('16000')
  const [selectedMap, setSelectedMap] = useState('de_dust2')
  const [maps, setMaps] = useState(DEFAULT_MAPS)
  const [mapFilter, setMapFilter] = useState('')
  const [customMap, setCustomMap] = useState('')
  const [log, setLog]                 = useState([])
  const [dragOver, setDragOver]       = useState(null) // 'ct' | 't' | null

  const { players, map, loading, error, refresh } = useServerStatus(3000)

  useEffect(() => {
    let cancelled = false
    api.getMaps()
      .then(data => {
        if (!cancelled && data.maps?.length) setMaps(data.maps)
      })
      .catch(e => addLog(`✗ Map list failed: ${e.message}`))
    return () => { cancelled = true }
  }, [])

  const visibleMaps = maps.filter(m => m.toLowerCase().includes(mapFilter.toLowerCase())).slice(0, 80)
  const shownMaps = visibleMaps.includes(selectedMap) ? visibleMaps : [selectedMap, ...visibleMaps]
  const mapToChange = customMap.trim() || selectedMap
  const isWorkshopMap = /^\d{6,20}$/.test(mapToChange)

  const ct      = players.filter(p => p.team === 'ct')
  const t       = players.filter(p => p.team === 't')
  const unknown = players.filter(p => p.team !== 'ct' && p.team !== 't')
  const ctDisplay = ct.length > 0 ? ct : unknown.filter((_,i) => i % 2 === 0)
  const tDisplay  = t.length  > 0 ? t  : unknown.filter((_,i) => i % 2 === 1)

  function addLog(msg) {
    setLog(prev => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev].slice(0, 50))
  }

  async function run(label, fn) {
    try { await fn(); addLog(`✓ ${label}`) }
    catch (e) { addLog(`✗ ${label}: ${e.message}`) }
  }

  // ── Drag & drop handlers ──────────────────────────────────────────────────
  function handleDragOver(e, targetTeam) {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDragOver(targetTeam)
  }

  async function handleDrop(e, targetTeam) {
    e.preventDefault()
    setDragOver(null)
    const userid   = e.dataTransfer.getData('userid')
    const fromTeam = e.dataTransfer.getData('fromTeam')
    if (!userid || fromTeam === targetTeam) return
    const player = players.find(p => p.userid === userid)
    const name   = player?.name || userid
    try {
      await api.setTeam(userid, targetTeam)
      addLog(`✓ Moved ${name} → ${targetTeam.toUpperCase()}`)
      setTimeout(refresh, 800) // refresh after a short delay
    } catch (e) {
      addLog(`✗ Move failed: ${e.message}`)
    }
  }

  if (!authed) return <Login onLogin={() => setAuthed(true)} />

  return (
    <div style={{ background:'#0d0f12', minHeight:'100vh', fontFamily:"'Rajdhani',sans-serif", color:'#e8eaf0', padding:14 }}>

      {/* TOPBAR */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', background:'#13161b', border:'1px solid #ffffff18', borderRadius:8, padding:'10px 18px', marginBottom:12 }}>
        <div style={{ fontSize:18, fontWeight:700, letterSpacing:'0.14em' }}>
          CS2 <span style={{ color:'#ffaa00' }}>ADMIN</span> PANEL
        </div>
        <div style={{ display:'flex', gap:22, alignItems:'center' }}>
          <Chip dot={error ? '#ff4545' : '#4cff91'}>{loading ? 'loading...' : `map: ${map}`}</Chip>
          <Chip dot="#4cff91">{players.length} players</Chip>
          {error && <Chip dot="#ff4545">{error}</Chip>}
        </div>
        <div style={{ display:'flex', gap:10, alignItems:'center' }}>
          <div style={{ fontSize:11, fontFamily:"'Share Tech Mono',monospace", padding:'4px 12px', borderRadius:4, border:'1px solid #4cff9140', background:'#4cff9112', color:'#4cff91' }}>
            ● RCON CONNECTED
          </div>
          <button onClick={() => { localStorage.removeItem('api_secret'); setAuthed(false) }}
            style={{ fontSize:11, fontFamily:"'Share Tech Mono',monospace", padding:'4px 12px', borderRadius:4, border:'1px solid #ffffff18', background:'transparent', color:'#8a909c', cursor:'pointer' }}>
            LOGOUT
          </button>
        </div>
      </div>

      {/* MAIN LAYOUT */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 230px 1fr', gap:10, alignItems:'start' }}>

        {/* CT DROP ZONE */}
        <TeamPanel
          title="COUNTER-TERRORIST" color="#4a9eff" count={ctDisplay.length}
          dropActive={dragOver === 'ct'}
          onDragOver={e => handleDragOver(e, 'ct')}
          onDragLeave={() => setDragOver(null)}
          onDrop={e => handleDrop(e, 'ct')}
        >
          {ctDisplay.map(p => <PlayerCard key={p.userid} player={p} team="ct" onLog={addLog} />)}
          {ctDisplay.length === 0 && <DropHint color="#4a9eff" active={dragOver === 'ct'} />}
        </TeamPanel>

        {/* CENTER */}
        <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
          <RoundControls onLog={addLog} />
          <AdminControls players={players} onLog={addLog} onRefresh={refresh} />

          <CBlock title="GIVE MONEY — ALL">
            <div style={{ display:'flex', gap:6, marginBottom:8 }}>
              <input value={moneyAmt} onChange={e => setMoneyAmt(e.target.value)}
                style={{ flex:1, fontFamily:"'Share Tech Mono',monospace", fontSize:12, padding:'7px 10px', borderRadius:6, border:'1px solid #ffffff18', background:'#1a1e26', color:'#e8eaf0' }} />
              <RBtn onClick={() => run(`Give all $${moneyAmt}`, () => api.giveMoneyAll(parseInt(moneyAmt)))}>SET</RBtn>
            </div>
            <div style={{ display:'flex', gap:5 }}>
              {[1000,2500,5000,16000].map(v => (
                <button key={v} onClick={() => { setMoneyAmt(String(v)); run(`Give all $${v}`, () => api.giveMoneyAll(v)) }}
                  style={{ flex:1, fontFamily:"'Share Tech Mono',monospace", fontSize:11, padding:'6px 4px', borderRadius:6, border:'1px solid #ffffff0f', background:'#1a1e26', color:'#8a909c', cursor:'pointer' }}>
                  {v >= 1000 ? `${v/1000}k` : v}
                </button>
              ))}
            </div>
          </CBlock>

          <CBlock title="GIVE WEAPON — ALL">
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:5 }}>
              {WEAPONS.map(w => (
                <button key={w} onClick={() => run(`Give all ${w}`, () => api.giveWeaponAll(w))}
                  style={{ fontFamily:"'Share Tech Mono',monospace", fontSize:11, padding:'7px 8px', borderRadius:6, border:'1px solid #ffffff0f', background:'#1a1e26', color:'#8a909c', cursor:'pointer', textAlign:'left' }}>
                  {w}
                </button>
              ))}
            </div>
          </CBlock>

          <CBlock title="CHANGE MAP">
            <input value={mapFilter} onChange={e => setMapFilter(e.target.value)} placeholder="filter maps..."
              style={{ width:'100%', boxSizing:'border-box', fontFamily:"'Share Tech Mono',monospace", fontSize:11, padding:'7px 10px', borderRadius:6, border:'1px solid #ffffff18', background:'#101319', color:'#e8eaf0', marginBottom:6 }}
            />
            <select value={selectedMap} onChange={e => { setSelectedMap(e.target.value); setCustomMap('') }}
              style={{ width:'100%', fontFamily:"'Share Tech Mono',monospace", fontSize:12, padding:'7px 10px', borderRadius:6, border:'1px solid #ffffff18', background:'#1a1e26', color:'#e8eaf0', marginBottom:6 }}>
              {shownMaps.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
            <input value={customMap} onChange={e => setCustomMap(e.target.value)} placeholder="custom map or workshop id"
              style={{ width:'100%', boxSizing:'border-box', fontFamily:"'Share Tech Mono',monospace", fontSize:11, padding:'7px 10px', borderRadius:6, border:'1px solid #ffaa0030', background:'#1a1e26', color:'#ffaa00', marginBottom:7 }}
            />
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:5 }}>
              <RBtn onClick={() => run(`${isWorkshopMap ? 'workshop' : 'changelevel'} ${mapToChange}`, () => api.changeLevel(mapToChange, isWorkshopMap ? 'workshop' : undefined))}>{isWorkshopMap ? 'workshop' : 'changelevel'}</RBtn>
              <RBtn onClick={() => run(`workshop ${mapToChange}`, () => api.changeLevel(mapToChange, 'workshop'))}>workshop</RBtn>
            </div>
          </CBlock>
        </div>

        {/* T DROP ZONE */}
        <TeamPanel
          title="TERRORIST" color="#ffaa00" count={tDisplay.length}
          dropActive={dragOver === 't'}
          onDragOver={e => handleDragOver(e, 't')}
          onDragLeave={() => setDragOver(null)}
          onDrop={e => handleDrop(e, 't')}
        >
          {tDisplay.map(p => <PlayerCard key={p.userid} player={p} team="t" onLog={addLog} />)}
          {tDisplay.length === 0 && <DropHint color="#ffaa00" active={dragOver === 't'} />}
        </TeamPanel>
      </div>

      {/* LOG */}
      {log.length > 0 && (
        <div style={{ marginTop:10, background:'#13161b', border:'1px solid #ffffff0f', borderRadius:8, padding:'10px 14px', maxHeight:140, overflowY:'auto' }}>
          {log.map((l,i) => (
            <div key={i} style={{ fontFamily:"'Share Tech Mono',monospace", fontSize:11, color: l.includes('✓') ? '#4cff91' : l.includes('✗') ? '#ff4545' : '#8a909c', marginBottom:2 }}>
              {l}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function Chip({ dot, children }) {
  return (
    <div style={{ display:'flex', alignItems:'center', gap:7, fontSize:12, fontFamily:"'Share Tech Mono',monospace", color:'#8a909c' }}>
      <span style={{ width:6, height:6, borderRadius:'50%', background:dot, flexShrink:0 }} />
      {children}
    </div>
  )
}

function TeamPanel({ title, color, count, children, dropActive, onDragOver, onDragLeave, onDrop }) {
  const isct = title.includes('COUNTER')
  const bar  = isct
    ? `linear-gradient(90deg, ${color}80, transparent)`
    : `linear-gradient(270deg, ${color}80, transparent)`
  return (
    <div
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      style={{
        background:'#13161b',
        border: `1px solid ${dropActive ? color + '60' : '#ffffff18'}`,
        borderRadius:10, overflow:'hidden',
        boxShadow: dropActive ? `0 0 20px ${color}20` : 'none',
        transition:'border-color .15s, box-shadow .15s',
      }}
    >
      <div style={{ height:2, background: dropActive ? color : bar, transition:'background .15s' }} />
      <div style={{ padding:'12px 16px', display:'flex', alignItems:'center', justifyContent:'space-between', borderBottom:'1px solid #ffffff0f' }}>
        <div>
          <div style={{ fontSize:10, fontWeight:700, letterSpacing:'0.18em', color }}>{title}</div>
          <div style={{ fontSize:13, color:'#8a909c', marginTop:2 }}>{count} players</div>
        </div>
        <div style={{ fontSize:30, fontWeight:700, color }}>{count}</div>
      </div>
      <div style={{ padding:10, display:'flex', flexDirection:'column', gap:6 }}>{children}</div>
    </div>
  )
}

function DropHint({ color, active }) {
  return (
    <div style={{
      border: `1px dashed ${active ? color : '#ffffff18'}`,
      borderRadius:6, padding:'20px 0', textAlign:'center',
      fontSize:11, fontFamily:"'Share Tech Mono',monospace",
      color: active ? color : '#454a54',
      background: active ? color + '08' : 'transparent',
      transition:'all .15s',
    }}>
      {active ? '⬇ drop to move here' : 'drag players here'}
    </div>
  )
}

function CBlock({ title, children }) {
  return (
    <div style={{ background:'#13161b', border:'1px solid #ffffff18', borderRadius:10, padding:'14px 16px' }}>
      <div style={{ fontSize:10, fontWeight:700, letterSpacing:'0.16em', color:'#8a909c', marginBottom:12 }}>{title}</div>
      {children}
    </div>
  )
}

function RBtn({ children, onClick, danger }) {
  return (
    <button onClick={onClick} style={{
      width:'100%', fontFamily:"'Rajdhani',sans-serif", fontSize:13, fontWeight:500,
      padding:'9px 12px', borderRadius:6, cursor:'pointer', textAlign:'left', marginBottom:5,
      border:`1px solid ${danger ? '#ff454530' : '#ffffff18'}`,
      background:'transparent', color: danger ? '#ff4545' : '#e8eaf0', letterSpacing:'0.04em',
    }}>
      {children}
    </button>
  )
}

function Empty({ children }) {
  return <div style={{ fontSize:12, color:'#454a54', textAlign:'center', padding:'20px 0', fontFamily:"'Share Tech Mono',monospace" }}>{children}</div>
}
