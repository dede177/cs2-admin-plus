const BASE = '/api'

function headers() {
  const secret = localStorage.getItem('api_secret') || ''
  return {
    'Content-Type': 'application/json',
    'x-api-secret': secret,
  }
}

async function post(path, body = {}) {
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

async function get(path) {
  const res = await fetch(`${BASE}${path}`, { headers: headers() })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

// Players
export const getStatus       = ()                     => get('/players')
export const respawnPlayer   = (userid)               => post('/players/respawn', { userid })
export const setTeam         = (userid, team)         => post('/players/setteam', { userid, team })
export const giveMoney       = (userid, amount)       => post('/players/givemoney', { userid, amount })
export const giveWeapon      = (userid, weapon)       => post('/players/giveweapon', { userid, weapon })
export const setHp           = (userid, hp)           => post('/players/sethp', { userid, hp })
export const freezePlayer    = (userid)               => post('/players/freeze', { userid })
export const unfreezePlayer  = (userid)               => post('/players/unfreeze', { userid })
export const stripWeapons    = (userid)               => post('/players/stripweapons', { userid })
export const godMode         = (userid)               => post('/players/god', { userid })
export const slapPlayer      = (userid, damage)       => post('/players/slap', { userid, damage })
export const kickPlayer      = (userid)               => post('/players/kick', { userid })

// Server
export const restartRound    = ()                     => post('/server/restartround')
export const endMatch        = ()                     => post('/server/endmatch')
export const startWarmup     = ()                     => post('/server/warmup')
export const getMaps         = ()                     => get('/server/maps')
export const changeLevel     = (map, mode)            => post('/server/changelevel', { map, mode })
export const giveMoneyAll    = (amount)               => post('/server/givemoney/all', { amount })
export const giveWeaponAll   = (weapon)               => post('/server/giveweapon/all', { weapon })
export const setCvar         = (key, value)           => post('/server/cvar', { key, value })
export const sendRcon        = (command)              => post('/rcon', { command })
