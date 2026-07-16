import { useState } from 'react'
import * as api from '../api/rcon'

const CHEAT_PRESETS = [
  ['Infinite ammo ON', 'sv_cheats 1; sv_infinite_ammo 1'],
  ['Infinite ammo OFF', 'sv_infinite_ammo 0'],
  ['Grenade practice ON', 'sv_cheats 1; sv_grenade_trajectory_prac_pipreview 1; sv_showimpacts 1; sv_showimpacts_time 10'],
  ['Grenade practice OFF', 'sv_grenade_trajectory_prac_pipreview 0; sv_showimpacts 0'],
  ['Buy anywhere ON', 'mp_buy_anywhere 1; mp_buytime 60000'],
  ['Buy anywhere OFF', 'mp_buy_anywhere 0; mp_buytime 20'],
  ['Free armor + helmet ON', 'mp_free_armor 2; mp_restartgame 1'],
  ['Free armor OFF', 'mp_free_armor 0; mp_restartgame 1'],
  ['No recoil/spread ON', 'sv_cheats 1; weapon_accuracy_nospread 1; weapon_recoil_scale 0'],
  ['No recoil/spread OFF', 'weapon_accuracy_nospread 0; weapon_recoil_scale 2'],
]

const PRACTICE_PRESETS = [
  ['Full practice mode', 'sv_cheats 1; mp_limitteams 0; mp_autoteambalance 0; mp_freezetime 0; mp_roundtime 60; mp_roundtime_defuse 60; mp_buy_anywhere 1; mp_buytime 60000; sv_infinite_ammo 1; ammo_grenade_limit_total 5; sv_grenade_trajectory_prac_pipreview 1; sv_showimpacts 1; mp_restartgame 1'],
  ['Competitive reset', 'sv_cheats 0; mp_limitteams 2; mp_autoteambalance 1; mp_freezetime 15; mp_roundtime 1.92; mp_roundtime_defuse 1.92; mp_buy_anywhere 0; mp_buytime 20; sv_infinite_ammo 0; sv_showimpacts 0; mp_restartgame 1'],
  ['Warmup forever', 'mp_warmuptime 999999; mp_warmup_pausetimer 1; mp_warmup_start'],
  ['End warmup', 'mp_warmup_pausetimer 0; mp_warmup_end'],
  ['Retake-style money', 'mp_startmoney 16000; mp_afterroundmoney 16000; mp_buytime 60000; mp_buy_anywhere 1'],
  ['Knife round', 'mp_startmoney 0; mp_free_armor 0; mp_ct_default_primary ""; mp_t_default_primary ""; mp_restartgame 1'],
]

const BOT_PRESETS = [
  ['Add CT bot', 'bot_add_ct'],
  ['Add T bot', 'bot_add_t'],
  ['Kick bots', 'bot_kick'],
  ['Stop bots ON', 'bot_stop 1'],
  ['Stop bots OFF', 'bot_stop 0'],
  ['Crouch bots ON', 'bot_crouch 1'],
  ['Crouch bots OFF', 'bot_crouch 0'],
  ['Bots mimic ON', 'bot_mimic 1'],
  ['Bots mimic OFF', 'bot_mimic 0'],
]

const MATCH_PRESETS = [
  ["Start Kimpi's 5v50", 'css_start'],
  ['Pause match', 'mp_pause_match'],
  ['Unpause match', 'mp_unpause_match'],
  ['Swap teams', 'mp_swapteams'],
  ['Scramble teams', 'mp_scrambleteams'],
  ['Restart 1s', 'mp_restartgame 1'],
  ['End match', 'mp_endmatch_votenextmap 0; mp_endmatch 1'],
]

const GIVE_ALL_WEAPONS = [
  ['AK-47 all', 'ak47'],
  ['M4A4 all', 'm4a4'],
  ['AWP all', 'awp'],
  ['Deagle all', 'deagle'],
  ['HE all', 'hegrenade'],
  ['Smoke all', 'smokegrenade'],
  ['Flash all', 'flashbang'],
  ['Molotov all', 'molotov'],
]

export default function AdminControls({ players, onLog, onRefresh }) {
  const [tab, setTab] = useState('players')
  const alivePlayers = players.filter(p => p.state === 'active')

  async function run(label, fn) {
    try {
      await fn()
      onLog?.(`✓ ${label}`)
      onRefresh?.()
    } catch (e) {
      onLog?.(`✗ ${label}: ${e.message}`)
    }
  }

  async function runRcon(label, command) {
    await run(label, () => api.sendRcon(command))
  }

  async function eachPlayer(label, action) {
    await run(label, async () => {
      for (const player of players) await action(player)
    })
  }

  return (
    <div style={{ background:'#13161b', border:'1px solid #ffffff18', borderRadius:10, overflow:'hidden' }}>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(5, 1fr)', borderBottom:'1px solid #ffffff0f' }}>
        {[
          ['players', 'PLAYERS'],
          ['cheats', 'CHEATS'],
          ['practice', 'PRACTICE'],
          ['bots', 'BOTS'],
          ['match', 'MATCH'],
        ].map(([id, label]) => (
          <button key={id} onClick={() => setTab(id)} style={{
            padding:'8px 0', border:'none', borderBottom: tab === id ? '2px solid #ffaa00' : '2px solid transparent',
            background: tab === id ? '#1a1e26' : 'transparent', color: tab === id ? '#ffaa00' : '#454a54',
            fontFamily:"'Share Tech Mono',monospace", fontSize:9, fontWeight:700, letterSpacing:'0.08em', cursor:'pointer',
          }}>{label}</button>
        ))}
      </div>

      <div style={{ padding:'12px 14px' }}>
        {tab === 'players' && (
          <Grid>
            <Btn green onClick={() => eachPlayer('Respawn all', p => api.respawnPlayer(p.userid))}>Respawn all</Btn>
            <Btn green onClick={() => eachPlayer('Toggle god all', p => api.godMode(p.userid))}>∞ HP / god toggle</Btn>
            <Btn onClick={() => eachPlayer('Set all HP 500', p => api.setHp(p.userid, 500))}>Set HP 500</Btn>
            <Btn onClick={() => eachPlayer('Set all HP 100', p => api.setHp(p.userid, 100))}>Set HP 100</Btn>
            <Btn onClick={() => eachPlayer('Freeze all', p => api.freezePlayer(p.userid))}>Freeze all</Btn>
            <Btn onClick={() => eachPlayer('Unfreeze all', p => api.unfreezePlayer(p.userid))}>Unfreeze all</Btn>
            <Btn onClick={() => eachPlayer('Strip all', p => api.stripWeapons(p.userid))}>Strip all</Btn>
            <Btn onClick={() => run('Max money all', () => api.giveMoneyAll(16000))}>Max money all</Btn>
            <Btn onClick={() => eachPlayer('Slap all', p => api.slapPlayer(p.userid, 0))}>Slap all</Btn>
            <Btn red onClick={() => eachPlayer('Kick all players', p => api.kickPlayer(p.userid))}>Kick all</Btn>
            <Info>{alivePlayers.length}/{players.length} active targets. God is a toggle; click again to disable.</Info>
          </Grid>
        )}

        {tab === 'cheats' && (
          <Grid>
            {CHEAT_PRESETS.map(([label, command]) => <Btn key={label} onClick={() => runRcon(label, command)}>{label}</Btn>)}
            {GIVE_ALL_WEAPONS.map(([label, weapon]) => (
              <Btn key={label} onClick={() => run(label, () => api.giveWeaponAll(weapon))}>{label}</Btn>
            ))}
          </Grid>
        )}

        {tab === 'practice' && (
          <Grid>
            {PRACTICE_PRESETS.map(([label, command]) => <Btn key={label} onClick={() => runRcon(label, command)}>{label}</Btn>)}
          </Grid>
        )}

        {tab === 'bots' && (
          <Grid>
            {BOT_PRESETS.map(([label, command]) => <Btn key={label} onClick={() => runRcon(label, command)}>{label}</Btn>)}
          </Grid>
        )}

        {tab === 'match' && (
          <Grid>
            {MATCH_PRESETS.map(([label, command]) => <Btn key={label} red={label === 'End match'} onClick={() => runRcon(label, command)}>{label}</Btn>)}
          </Grid>
        )}
      </div>
    </div>
  )
}

function Grid({ children }) {
  return <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:5 }}>{children}</div>
}

function Info({ children }) {
  return <div style={{ gridColumn:'1 / -1', fontSize:10, color:'#454a54', fontFamily:"'Share Tech Mono',monospace", padding:'4px 2px' }}>{children}</div>
}

function Btn({ children, onClick, red, green }) {
  const [hover, setHover] = useState(false)
  return (
    <button onClick={onClick} onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)} style={{
      fontFamily:"'Rajdhani',sans-serif", fontSize:12, fontWeight:600, padding:'7px 8px', borderRadius:6,
      border:`1px solid ${red ? '#ff454530' : green ? '#4cff9130' : hover ? '#ffaa0030' : '#ffffff12'}`,
      background: hover ? (red ? '#ff454510' : green ? '#4cff9110' : '#ffaa000d') : '#1a1e26',
      color: red ? '#ff4545' : green ? '#4cff91' : '#e8eaf0', cursor:'pointer', textAlign:'left',
      letterSpacing:'0.03em', transition:'all .12s',
    }}>{children}</button>
  )
}
