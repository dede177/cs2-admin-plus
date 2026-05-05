const net = require('net')

const SERVERDATA_AUTH        = 3
const SERVERDATA_EXECCOMMAND = 2

let socket        = null
let authed        = false
let callbackQueue = []
let recvBuffer    = Buffer.alloc(0)
let packetId      = 1

function buildPacket(id, type, body) {
  const bodyBuf = Buffer.from(body + '\0', 'utf8')
  const size    = 4 + 4 + bodyBuf.length + 1
  const buf     = Buffer.alloc(4 + size)
  buf.writeInt32LE(size, 0)
  buf.writeInt32LE(id,   4)
  buf.writeInt32LE(type, 8)
  bodyBuf.copy(buf, 12)
  buf.writeUInt8(0, 12 + bodyBuf.length)
  return buf
}

function parsePackets(data) {
  recvBuffer = Buffer.concat([recvBuffer, data])
  const packets = []
  while (recvBuffer.length >= 4) {
    const size = recvBuffer.readInt32LE(0)
    if (recvBuffer.length < 4 + size) break
    const id   = recvBuffer.readInt32LE(4)
    const type = recvBuffer.readInt32LE(8)
    const body = recvBuffer.slice(12, 4 + size - 2).toString('utf8')
    packets.push({ id, type, body })
    recvBuffer = recvBuffer.slice(4 + size)
  }
  return packets
}

async function createRconClient() {
  const host     = String(process.env.RCON_HOST     || '').trim()
  const port     = parseInt(String(process.env.RCON_PORT || '27015').trim(), 10)
  const password = String(process.env.RCON_PASSWORD || '').trim()

  if (!host || !port || !password)
    throw new Error(`Missing RCON config — host:"${host}" port:${port} password:"${password ? '***' : 'MISSING'}"`)

  return new Promise((resolve, reject) => {
    if (socket) { try { socket.destroy() } catch(_) {} }
    const client = new net.Socket()
    socket        = client
    authed        = false
    recvBuffer    = Buffer.alloc(0)
    callbackQueue = []

    client.connect(port, host, () => {
      const id = packetId++
      callbackQueue.push({ id, isAuth: true, resolve, reject })
      client.write(buildPacket(id, SERVERDATA_AUTH, password))
    })

    client.on('data', (data) => {
      for (const pkt of parsePackets(data)) {
        if (!callbackQueue.length) continue
        const cb = callbackQueue[0]
        if (cb.isAuth) {
          callbackQueue.shift()
          if (pkt.id === -1) {
            cb.reject(new Error('RCON auth failed — wrong password?'))
          } else {
            authed = true
            console.log(`[RCON] ✅ Authenticated on ${host}:${port}`)
            cb.resolve()
          }
        } else {
          const idx = callbackQueue.findIndex(item => item.id === pkt.id && !item.isAuth)
          if (idx === -1) continue
          const cmdCb = callbackQueue[idx]
          cmdCb.chunks.push(pkt.body)
          clearTimeout(cmdCb.quietTimer)
          cmdCb.quietTimer = setTimeout(() => {
            const currentIdx = callbackQueue.indexOf(cmdCb)
            if (currentIdx !== -1) callbackQueue.splice(currentIdx, 1)
            cmdCb.resolve(cmdCb.chunks.filter(Boolean).join(''))
          }, 150)
        }
      }
    })

    client.on('error', (err) => {
      const cb = callbackQueue.shift()
      if (cb) (cb.reject || cb.resolve)(err)
      reject(err)
    })

    client.on('close', () => {
      authed = false
      if (socket === client) socket = null
    })
    client.setTimeout(8000, () => { client.destroy(); reject(new Error('RCON connection timed out')) })
  })
}

async function executeCommand(command) {
  if (!socket || !authed) await createRconClient()
  return new Promise((resolve, reject) => {
    const id    = packetId++
    const timer = setTimeout(() => {
      const idx = callbackQueue.findIndex(item => item.id === id && !item.isAuth)
      if (idx !== -1) callbackQueue.splice(idx, 1)
      reject(new Error(`RCON timeout: ${command}`))
    }, 5000)
    callbackQueue.push({
      id,
      chunks: [],
      quietTimer: null,
      resolve: (v) => { clearTimeout(timer); resolve(v) },
      reject:  (e) => { clearTimeout(timer); reject(e) },
    })
    socket.write(buildPacket(id, SERVERDATA_EXECCOMMAND, command))
  })
}

// ─── CS2 status parser ───────────────────────────────────────────────────────
// Real CS2 format:
//    id    time ping loss      state   rate               adr name
//     2   02:06   43    0     active 786432 170.78.244.225:4613 'dede'
//     0     BOT    0    0     active      0                   0 'Maximus'
// 65535 [NoChan]   0    0 challenging      0             unknown ''   ← RCON client, skip

function parseStatus(raw) {
  const players = []
  const lines   = raw.split('\n')

  for (const line of lines) {
    // Match lines starting with a numeric id (player rows)
    // id is at start with whitespace, name is in single quotes at end
    const m = line.match(/^\s*(\d+)\s+(\S+)\s+(\d+)\s+(\d+)\s+(\w+)\s+\d+\s+\S+\s+'(.*)'/)
    if (!m) continue

    const userid = m[1]
    const time   = m[2]  // 'BOT' for bots, '02:06' for players
    const ping   = parseInt(m[3])
    const state  = m[5]
    const name   = m[6]

    // Skip: RCON listener (id 65535), empty names, challenging state
    if (userid === '65535') continue
    if (name === '')        continue
    if (state === 'challenging') continue

    const isBot = time === 'BOT'

    players.push({
      userid,
      name,
      ping,
      state,
      isBot,
      team: 'unknown',
      hp:   100,
    })
  }

  // Extract map from first spawngroup line: "loaded spawngroup( 1) : SV: [1: de_dust2 |"
  let map = 'unknown'
  const mapMatch = raw.match(/loaded spawngroup\(\s*1\).*\[1:\s*(\S+?)\s*\|/)
  if (mapMatch) {
    map = mapMatch[1]
  } else {
    // Fallback: "map     : de_dust2"
    const m2 = raw.match(/^map\s*:\s*(\S+)/m)
    if (m2) map = m2[1]
  }

  console.log(`[Status] map=${map} players=${players.length}`, players.map(p => p.name))
  return { players, map }
}

async function getStatus() {
  return parseStatus(await executeCommand('status'))
}

module.exports = { createRconClient, executeCommand, getStatus }


// ─── Plugin-based player info (team, hp, money, alive) ───────────────────────
// Uses sm_playerinfo_all from the AdminPlus plugin
// Falls back to status if plugin not loaded

async function getPlayerInfo() {
  try {
    const raw = await executeCommand('sm_playerinfo_all')

    // Check if plugin responded
    if (!raw || !raw.includes('PLAYERINFO:')) {
      console.warn('[AdminPlus] Plugin not responding, falling back to status')
      return getStatus()
    }

    const players = []
    for (const line of raw.split('\n')) {
      const match = line.match(/PLAYERINFO:(\d+)\|(.+?)\|(\w+)\|(\d+)\|(\d+)\|([01])/)
      if (!match) continue
      players.push({
        userid: match[1],
        name:   match[2],
        team:   match[3],   // ct / t / spec / none
        hp:     parseInt(match[4]),
        money:  parseInt(match[5]),
        state:  match[6] === '1' ? 'active' : 'dead',
        ping:   0,
        isBot:  false,
      })
    }

    // Get map from status (still needed)
    const statusRaw = await executeCommand('status')
    const mapMatch  = statusRaw.match(/loaded spawngroup\(\s*1\).*\[1:\s*(\S+?)\s*\|/)
    const map       = mapMatch ? mapMatch[1] : (statusRaw.match(/^map\s*:\s*(\S+)/m)?.[1] || 'unknown')

    console.log(`[PlayerInfo] map=${map} players=${players.length}`, players.map(p => `${p.name}(${p.team})`))
    return { players, map }

  } catch (err) {
    console.warn('[AdminPlus] Plugin error, falling back to status:', err.message)
    return getStatus()
  }
}

module.exports = { createRconClient, executeCommand, getStatus, getPlayerInfo }
