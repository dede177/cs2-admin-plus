import { useState } from 'react'
import * as api from '../api/rcon'
import { Button, Field } from '../components/ui.jsx'
import Cs2Icon from '../components/Cs2Icon.jsx'

const DEMO_MODE = import.meta.env.VITE_DEMO_MODE === 'true'

const TRAINING_TOGGLES = [
  ['Enable Bots', 'bot_stop 0', 'bot_stop 1'],
  ['Infinite Ammo', 'sv_cheats 1; sv_infinite_ammo 1', 'sv_infinite_ammo 0'],
  ['Multi-Touch', null, null],
  ['No Recoil', 'sv_cheats 1; weapon_recoil_scale 0', 'weapon_recoil_scale 2'],
  ['No Spread', 'sv_cheats 1; weapon_accuracy_nospread 1', 'weapon_accuracy_nospread 0'],
  ['Godmode', 'sv_cheats 1; god', 'god'],
  ['Infinite Utility', 'sv_cheats 1; sv_infinite_ammo 1; ammo_grenade_limit_total 5', 'sv_infinite_ammo 0'],
  ['Show Impacts', 'sv_cheats 1; sv_showimpacts 1; sv_showimpacts_time 10', 'sv_showimpacts 0'],
]

const BOT_ACTIONS = [
  ['Add CT bot', 'bot_add_ct'], ['Add T bot', 'bot_add_t'], ['Kick bots', 'bot_kick'],
  ['Stop bots ON', 'bot_stop 1'], ['Stop bots OFF', 'bot_stop 0'],
  ['Crouch bots ON', 'bot_crouch 1'], ['Crouch bots OFF', 'bot_crouch 0'],
  ['Bots mimic ON', 'bot_mimic 1'], ['Bots mimic OFF', 'bot_mimic 0'],
]

const PRACTICE_PRESETS = [
  ['Full practice mode', 'sv_cheats 1; mp_limitteams 0; mp_autoteambalance 0; mp_freezetime 0; mp_roundtime 60; mp_roundtime_defuse 60; mp_buy_anywhere 1; mp_buytime 60000; sv_infinite_ammo 1; ammo_grenade_limit_total 5; sv_grenade_trajectory_prac_pipreview 1; sv_showimpacts 1; mp_restartgame 1'],
  ['Competitive reset', 'sv_cheats 0; mp_limitteams 2; mp_autoteambalance 1; mp_freezetime 15; mp_roundtime 1.92; mp_roundtime_defuse 1.92; mp_buy_anywhere 0; mp_buytime 20; sv_infinite_ammo 0; sv_showimpacts 0; mp_restartgame 1'],
  ['Warmup forever', 'mp_warmuptime 999999; mp_warmup_pausetimer 1; mp_warmup_start'],
  ['End warmup', 'mp_warmup_pausetimer 0; mp_warmup_end'],
  ['Retake-style money', 'mp_startmoney 16000; mp_afterroundmoney 16000; mp_buytime 60000; mp_buy_anywhere 1'],
  ['Knife round', 'mp_startmoney 0; mp_free_armor 0; mp_ct_default_primary ""; mp_t_default_primary ""; mp_restartgame 1'],
]

const MATCH_ACTIONS = [
  ["Start Kimpi's 5v50", 'css_start'], ["Stop Kimpi's 5v50", 'css_stop'], ['Negev next round', 'css_negev'],
  ['Pause match', 'mp_pause_match'], ['Unpause match', 'mp_unpause_match'], ['Swap teams', 'mp_swapteams'],
  ['Scramble teams', 'mp_scrambleteams'], ['Restart round', 'mp_restartgame 1'], ['End match', 'mp_endmatch_votenextmap 0; mp_endmatch 1'],
]

export default function Practice({ onRun }) {
  const [tab, setTab] = useState('training')
  const [toggles, setToggles] = useState({ 'Enable Bots': true, 'Infinite Ammo': true, 'No Recoil': true, 'Infinite Utility': true })
  const [busy, setBusy] = useState('')
  const [grenadeType, setGrenadeType] = useState('Smoke')
  const [grenadeMode, setGrenadeMode] = useState('Once')
  const [trajectory, setTrajectory] = useState(true)
  const [warmupTime, setWarmupTime] = useState('60')
  const [freezeTime, setFreezeTime] = useState('15')
  const [roundTime, setRoundTime] = useState('1.92')

  async function run(key, label, command) {
    setBusy(key)
    try {
      await onRun(label, () => api.sendRcon(command))
    } finally {
      setBusy('')
    }
  }

  async function toggle(label, onCommand, offCommand) {
    const next = !toggles[label]
    setToggles((prev) => ({ ...prev, [label]: next }))
    try {
      await onRun(`${label} ${next ? 'enabled' : 'disabled'}`, () => api.sendRcon(next ? onCommand : offCommand))
    } catch (error) {
      setToggles((prev) => ({ ...prev, [label]: !next }))
      throw error
    }
  }

  return (
    <div className="page-shell practice-page">
      <section className="practice-banner">
        <div>
          <h1>Practice / Cheats / Bots</h1>
          <p>Train nades, movement, and more. Make a better server.</p>
        </div>
        <img src="/mockup-art/practice-header-art.png" alt="" />
      </section>

      <div className="practice-tabs">
        <button className={tab === 'training' ? 'is-active' : ''} onClick={() => setTab('training')}>Training</button>
        <button className={tab === 'bots' ? 'is-active' : ''} onClick={() => setTab('bots')}>Bot Settings</button>
        <button className={tab === 'misc' ? 'is-active' : ''} onClick={() => setTab('misc')}>Misc</button>
      </div>

      {tab === 'training' && (
        <div className="practice-workspace">
          <section className="practice-switches">
            {TRAINING_TOGGLES.map(([label, onCommand, offCommand]) => (
              <label className={`toggle-row ${!onCommand ? 'is-disabled' : ''}`} key={label} title={!onCommand ? 'Not exposed by the current server API' : undefined}>
                <span>{label}</span>
                <input type="checkbox" disabled={!onCommand} checked={!!toggles[label]} onChange={() => onCommand && toggle(label, onCommand, offCommand).catch(() => {})} />
                <span className="toggle-control" aria-hidden="true" />
              </label>
            ))}
          </section>

          <section className="grenade-card">
            <div className="grenade-card__heading"><strong>Grenade Practice</strong><span>Spawn nades and practice lineups.</span></div>
            <Field label="Grenade Type"><select value={grenadeType} onChange={(e) => setGrenadeType(e.target.value)}><option>Smoke</option><option>Flash</option><option>HE</option><option>Molotov</option></select></Field>
            <Field label="Mode"><select value={grenadeMode} onChange={(e) => setGrenadeMode(e.target.value)}><option>Once</option><option>Repeat</option></select></Field>
            <label className="grenade-trajectory"><span>Show Trajectory</span><input type="checkbox" checked={trajectory} onChange={() => {
              const next = !trajectory
              setTrajectory(next)
              onRun(`Trajectory ${next ? 'enabled' : 'disabled'}`, () => api.sendRcon(`sv_cheats 1; sv_grenade_trajectory_prac_pipreview ${next ? 1 : 0}`)).catch(() => setTrajectory(!next))
            }} /><span className="toggle-control" /></label>
            <div className="grenade-tip"><strong><Cs2Icon name="info" size={12} />Tip</strong><span>Use grenade practice to learn lineups and improve your utility usage.</span></div>
          </section>

          <section className="practice-demo">
            <img src="/mockup-art/practice-mirage.png" alt="Mirage smoke practice" />
            <div className="practice-demo__actions">
              <button disabled={!DEMO_MODE} title={!DEMO_MODE ? 'No server-side camera preset is configured' : undefined} onClick={() => DEMO_MODE && onRun('Recentered practice look', async () => ({}))}>Recenter Look</button>
              <button disabled={!DEMO_MODE} title={!DEMO_MODE ? 'No server-side teleport preset is configured' : undefined} onClick={() => DEMO_MODE && onRun('Teleported to A', async () => ({}))}>Teleport to A</button>
            </div>
          </section>
        </div>
      )}

      {tab === 'bots' && (
        <section className="practice-subpanel">
          <h2>Bot Settings</h2>
          <div className="command-card-grid">
            {BOT_ACTIONS.map(([label, command]) => <Button key={label} busy={busy === label} onClick={() => run(label, label, command)}>{label}</Button>)}
          </div>
        </section>
      )}

      {tab === 'misc' && (
        <div className="practice-misc-grid">
          <section className="practice-subpanel">
            <h2>Practice Presets</h2>
            <div className="command-card-grid">
              {PRACTICE_PRESETS.map(([label, command]) => <Button key={label} busy={busy === label} onClick={() => run(label, label, command)}>{label}</Button>)}
            </div>
          </section>
          <section className="practice-subpanel">
            <h2>Match Controls</h2>
            <div className="command-card-grid">
              {MATCH_ACTIONS.map(([label, command]) => <Button key={label} tone={label === 'End match' || label.startsWith('Stop Kimpi') ? 'danger' : 'default'} busy={busy === label} onClick={() => {
                if (label === 'End match' && !window.confirm('End the current match?')) return
                run(label, label, command)
              }}>{label}</Button>)}
            </div>
          </section>
          <section className="practice-subpanel practice-round-config">
            <h2>Round Configuration</h2>
            <div className="settings-form-grid">
              <Field label="Warmup time"><input type="number" value={warmupTime} onChange={(e) => setWarmupTime(e.target.value)} /></Field><Button onClick={() => run('warmup-time', `Set warmup to ${warmupTime}s`, `mp_warmuptime ${warmupTime}`)}>Set</Button>
              <Field label="Freeze time"><input type="number" value={freezeTime} onChange={(e) => setFreezeTime(e.target.value)} /></Field><Button onClick={() => run('freeze-time', `Set freeze time to ${freezeTime}s`, `mp_freezetime ${freezeTime}`)}>Set</Button>
              <Field label="Round time"><input type="number" step="0.01" value={roundTime} onChange={(e) => setRoundTime(e.target.value)} /></Field><Button onClick={() => run('round-time', `Set round time to ${roundTime}m`, `mp_roundtime ${roundTime}; mp_roundtime_defuse ${roundTime}`)}>Set</Button>
            </div>
          </section>
        </div>
      )}
    </div>
  )
}
