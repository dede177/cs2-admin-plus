import { useState } from 'react'
import * as api from '../api/rcon'

export default function RoundControls({ onLog }) {
  const [warmupTime, setWarmupTime] = useState('60')
  const [restartDelay, setRestartDelay] = useState('1')
  const [freezeTime, setFreezeTime] = useState('15')
  const [roundTime, setRoundTime] = useState('1.92')
  const [section, setSection] = useState('round') // 'round' | 'warmup' | 'config'

  async function run(label, cmd) {
    try {
      await api.sendRcon(cmd)
      if (onLog) onLog(`✓ ${label}`)
    } catch (e) {
      if (onLog) onLog(`✗ ${label}: ${e.message}`)
    }
  }

  return (
    <div style={{ background:'#13161b', border:'1px solid #ffffff18', borderRadius:10, overflow:'hidden' }}>
      {/* Tab bar */}
      <div style={{ display:'flex', borderBottom:'1px solid #ffffff0f' }}>
        {[['round','ROUND'],['warmup','WARM-UP'],['config','CONFIG']].map(([id, label]) => (
          <button key={id} onClick={() => setSection(id)} style={{
            flex:1, padding:'9px 0', fontFamily:"'Share Tech Mono',monospace",
            fontSize:10, fontWeight:700, letterSpacing:'0.12em', cursor:'pointer',
            border:'none', borderBottom: section === id ? `2px solid #ffaa00` : '2px solid transparent',
            background: section === id ? '#1a1e26' : 'transparent',
            color: section === id ? '#ffaa00' : '#454a54',
            transition:'all .15s',
          }}>
            {label}
          </button>
        ))}
      </div>

      <div style={{ padding:'12px 14px' }}>

        {/* ── ROUND TAB ── */}
        {section === 'round' && (
          <div style={{ display:'flex', flexDirection:'column', gap:5 }}>
            <Row label="Restart in" value={restartDelay} onChange={setRestartDelay} unit="sec" min={1} max={10}
              onAction={() => run(`Restart round (${restartDelay}s)`, `mp_restartgame ${restartDelay}`)}
              actionLabel="↺ RESTART"
            />
            <Divider />
            <ActionBtn onClick={() => run('Next round', 'mp_restartgame 1')}>⏭ Next Round</ActionBtn>
            <ActionBtn onClick={() => run('Pause match', 'mp_pause_match')}>⏸ Pause Match</ActionBtn>
            <ActionBtn onClick={() => run('Unpause match', 'mp_unpause_match')}>▶ Unpause Match</ActionBtn>
            <ActionBtn onClick={() => run('Swap teams', 'mp_swapteams')}>⇄ Swap Teams</ActionBtn>
            <ActionBtn onClick={() => run('Scramble teams', 'mp_scrambleteams')}>⤢ Scramble Teams</ActionBtn>
            <Divider />
            <ActionBtn danger onClick={() => run('End match', 'mp_endmatch_votenextmap 0; mp_endmatch 1')}>■ End Match</ActionBtn>
          </div>
        )}

        {/* ── WARM-UP TAB ── */}
        {section === 'warmup' && (
          <div style={{ display:'flex', flexDirection:'column', gap:5 }}>
            <ActionBtn green onClick={() => run('Start warm-up', 'mp_warmup_start')}>▶ Start Warm-up</ActionBtn>
            <ActionBtn onClick={() => run('End warm-up', 'mp_warmup_end')}>⏹ End Warm-up</ActionBtn>
            <Divider />
            <Row label="Warm-up time" value={warmupTime} onChange={setWarmupTime} unit="sec" min={10} max={600}
              onAction={() => run(`Set warmup ${warmupTime}s`, `mp_warmuptime ${warmupTime}`)}
              actionLabel="SET"
            />
            <Divider />
            <Label>WARM-UP PRESETS</Label>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:4 }}>
              {[[30,'30s'],[60,'1m'],[120,'2m'],[300,'5m']].map(([v,l]) => (
                <PresetBtn key={v} onClick={() => run(`Warmup ${l}`, `mp_warmuptime ${v}; mp_warmup_start`)}>{l}</PresetBtn>
              ))}
            </div>
            <Divider />
            <ActionBtn onClick={() => run('Infinite warm-up ON', 'mp_warmup_pausetimer 1')}>∞ Pause Timer</ActionBtn>
            <ActionBtn onClick={() => run('Infinite warm-up OFF', 'mp_warmup_pausetimer 0')}>▶ Resume Timer</ActionBtn>
          </div>
        )}

        {/* ── CONFIG TAB ── */}
        {section === 'config' && (
          <div style={{ display:'flex', flexDirection:'column', gap:5 }}>
            <Row label="Freeze time" value={freezeTime} onChange={setFreezeTime} unit="sec" min={0} max={60}
              onAction={() => run(`Freeze time ${freezeTime}s`, `mp_freezetime ${freezeTime}`)}
              actionLabel="SET"
            />
            <Row label="Round time" value={roundTime} onChange={setRoundTime} unit="min" min={0.5} max={60} step={0.5}
              onAction={() => run(`Round time ${roundTime}m`, `mp_roundtime ${roundTime}`)}
              actionLabel="SET"
            />
            <Divider />
            <Label>CHEATS / SERVER</Label>
            <ActionBtn onClick={() => run('sv_cheats ON', 'sv_cheats 1')}>sv_cheats 1</ActionBtn>
            <ActionBtn onClick={() => run('sv_cheats OFF', 'sv_cheats 0')}>sv_cheats 0</ActionBtn>
            <ActionBtn onClick={() => run('God all ON', 'sv_cheats 1; god')}>god (all)</ActionBtn>
            <ActionBtn onClick={() => run('Buddha all ON', 'sv_cheats 1; buddha')}>buddha (all)</ActionBtn>
            <ActionBtn onClick={() => run('Buddha all OFF', 'sv_cheats 1; buddha 0; sv_cheats 0')}>buddha off (all)</ActionBtn>
            <ActionBtn onClick={() => run('No clip ON', 'sv_cheats 1; noclip')}>noclip</ActionBtn>
            <Divider />
            <Label>BUY SETTINGS</Label>
            <ActionBtn onClick={() => run('Buy anywhere ON', 'mp_buy_anywhere 1; mp_buytime 60000')}>Buy Anywhere</ActionBtn>
            <ActionBtn onClick={() => run('Buy anywhere OFF', 'mp_buy_anywhere 0; mp_buytime 20')}>Buy Zone Only</ActionBtn>
            <ActionBtn onClick={() => run('Infinite money', 'mp_startmoney 65535; mp_afterroundmoney 65535')}>∞ Infinite Money</ActionBtn>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function ActionBtn({ children, onClick, danger, green }) {
  const [hov, setHov] = useState(false)
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        width:'100%', fontFamily:"'Rajdhani',sans-serif", fontSize:13, fontWeight:500,
        padding:'8px 12px', borderRadius:6, cursor:'pointer', textAlign:'left',
        border:`1px solid ${danger ? '#ff454530' : green ? '#4cff9130' : hov ? '#ffffff28' : '#ffffff10'}`,
        background: hov ? (danger ? '#ff454510' : green ? '#4cff9110' : '#20252f') : 'transparent',
        color: danger ? '#ff4545' : green ? '#4cff91' : '#e8eaf0',
        letterSpacing:'0.04em', transition:'all .12s',
      }}
    >
      {children}
    </button>
  )
}

function Row({ label, value, onChange, unit, min, max, step=1, onAction, actionLabel }) {
  return (
    <div style={{ display:'flex', alignItems:'center', gap:6 }}>
      <span style={{ fontSize:11, color:'#8a909c', fontFamily:"'Share Tech Mono',monospace", flex:1, whiteSpace:'nowrap' }}>{label}</span>
      <input
        type="number" value={value} min={min} max={max} step={step}
        onChange={e => onChange(e.target.value)}
        style={{
          width:52, fontFamily:"'Share Tech Mono',monospace", fontSize:11,
          padding:'4px 6px', borderRadius:5, border:'1px solid #ffffff18',
          background:'#1a1e26', color:'#e8eaf0', textAlign:'right',
        }}
      />
      <span style={{ fontSize:10, color:'#454a54', fontFamily:"'Share Tech Mono',monospace", minWidth:22 }}>{unit}</span>
      <button onClick={onAction} style={{
        fontFamily:"'Share Tech Mono',monospace", fontSize:10, padding:'4px 8px',
        borderRadius:4, cursor:'pointer', border:'1px solid #ffffff18',
        background:'transparent', color:'#8a909c', letterSpacing:'0.06em',
        whiteSpace:'nowrap',
      }}>
        {actionLabel}
      </button>
    </div>
  )
}

function PresetBtn({ children, onClick }) {
  const [hov, setHov] = useState(false)
  return (
    <button onClick={onClick}
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{
        fontFamily:"'Share Tech Mono',monospace", fontSize:11, padding:'6px',
        borderRadius:5, cursor:'pointer', textAlign:'center',
        border:`1px solid ${hov ? '#ffaa0040' : '#ffffff0f'}`,
        background: hov ? '#ffaa0010' : '#1a1e26',
        color: hov ? '#ffaa00' : '#8a909c', transition:'all .1s',
      }}>
      {children}
    </button>
  )
}

function Divider() {
  return <div style={{ height:1, background:'#ffffff08', margin:'3px 0' }} />
}

function Label({ children }) {
  return <div style={{ fontSize:9, fontWeight:700, letterSpacing:'0.16em', color:'#454a54', fontFamily:"'Share Tech Mono',monospace", marginTop:2 }}>{children}</div>
}
