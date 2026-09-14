import { useMemo, useState } from 'react'
import * as api from '../api/rcon'
import { Button, Field, Modal } from './ui.jsx'
import { avatarBackgroundStyle } from '../lib/avatars.js'

const WEAPONS = [
  'ak47', 'm4a4', 'm4a1_silencer', 'awp', 'deagle', 'famas', 'aug', 'sg553',
  'mp9', 'hegrenade', 'smokegrenade', 'flashbang', 'molotov',
]

export default function PlayerActionDrawer({ player, onClose, onRun, onRefresh }) {
  const [hp, setHp] = useState(String(player.hp ?? 100))
  const [money, setMoney] = useState(String(player.money ?? 16000))
  const [weapon, setWeapon] = useState('ak47')
  const [slap, setSlap] = useState('0')
  const [busy, setBusy] = useState('')

  const state = useMemo(() => player.state === 'active' ? 'Alive' : 'Dead', [player.state])

  async function run(key, label, fn) {
    setBusy(key)
    try {
      await onRun(label, fn)
      await onRefresh?.({ silent: true }).catch(() => {})
    } finally {
      setBusy('')
    }
  }

  return (
    <Modal title={player.name} onClose={onClose} width="680px">
      <div className="player-modal__summary">
        <div
          className={`player-avatar player-avatar--${player.team || 'spec'} ${player.avatar ? 'player-avatar--photo' : ''}`}
          style={player.avatar ? avatarBackgroundStyle(player) : undefined}
        >
          {player.avatar ? '' : player.name.slice(0, 2).toUpperCase()}
        </div>
        <div>
          <strong>{player.name}</strong>
          <span>{(player.team || 'spec').toUpperCase()} · {state}</span>
        </div>
        <dl>
          <div><dt>HP</dt><dd>{player.hp ?? '—'}</dd></div>
          <div><dt>Money</dt><dd>{player.money !== undefined ? `$${Number(player.money).toLocaleString()}` : '—'}</dd></div>
          <div><dt>User ID</dt><dd>{player.userid}</dd></div>
        </dl>
      </div>

      <div className="action-grid action-grid--top">
        <Button tone="primary" busy={busy === 'respawn'} onClick={() => run('respawn', `Respawned ${player.name}`, () => api.respawnPlayer(player.userid))}>Respawn</Button>
        <Button busy={busy === 'freeze'} onClick={() => run('freeze', `Froze ${player.name}`, () => api.freezePlayer(player.userid))}>Freeze</Button>
        <Button busy={busy === 'unfreeze'} onClick={() => run('unfreeze', `Unfroze ${player.name}`, () => api.unfreezePlayer(player.userid))}>Unfreeze</Button>
        <Button busy={busy === 'god'} onClick={() => run('god', `Toggled god mode for ${player.name}`, () => api.godMode(player.userid))}>God Mode</Button>
        <Button busy={busy === 'strip'} onClick={() => run('strip', `Stripped ${player.name}`, () => api.stripWeapons(player.userid))}>Strip Weapons</Button>
        <Button tone="danger" busy={busy === 'kick'} onClick={() => run('kick', `Kicked ${player.name}`, () => api.kickPlayer(player.userid))}>Kick Player</Button>
      </div>

      <div className="player-modal__forms">
        <div className="inline-form-card">
          <Field label="Set health">
            <input type="number" min="1" max="500" value={hp} onChange={(e) => setHp(e.target.value)} />
          </Field>
          <Button busy={busy === 'hp'} onClick={() => run('hp', `Set ${player.name} HP to ${hp}`, () => api.setHp(player.userid, Number(hp)))}>Set HP</Button>
        </div>

        <div className="inline-form-card">
          <Field label="Set money">
            <input type="number" min="0" max="65535" value={money} onChange={(e) => setMoney(e.target.value)} />
          </Field>
          <Button busy={busy === 'money'} onClick={() => run('money', `Set ${player.name} money to $${money}`, () => api.giveMoney(player.userid, Number(money)))}>Set Money</Button>
        </div>

        <div className="inline-form-card">
          <Field label="Give weapon">
            <select value={weapon} onChange={(e) => setWeapon(e.target.value)}>
              {WEAPONS.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
          </Field>
          <Button busy={busy === 'weapon'} onClick={() => run('weapon', `Gave ${weapon} to ${player.name}`, () => api.giveWeapon(player.userid, weapon))}>Give Weapon</Button>
        </div>

        <div className="inline-form-card">
          <Field label="Slap damage">
            <input type="number" min="0" max="500" value={slap} onChange={(e) => setSlap(e.target.value)} />
          </Field>
          <Button busy={busy === 'slap'} onClick={() => run('slap', `Slapped ${player.name} for ${slap}`, () => api.slapPlayer(player.userid, Number(slap)))}>Slap</Button>
        </div>
      </div>

      <div className="move-team-row">
        <span>Move player</span>
        <div>
          <Button size="sm" busy={busy === 'ct'} onClick={() => run('ct', `Moved ${player.name} to CT`, () => api.setTeam(player.userid, 'ct'))}>CT</Button>
          <Button size="sm" busy={busy === 't'} onClick={() => run('t', `Moved ${player.name} to T`, () => api.setTeam(player.userid, 't'))}>T</Button>
          <Button size="sm" busy={busy === 'spec'} onClick={() => run('spec', `Moved ${player.name} to Spectators`, () => api.setTeam(player.userid, 'spec'))}>Spectator</Button>
        </div>
      </div>
    </Modal>
  )
}
