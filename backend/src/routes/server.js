const fs = require('fs')
const path = require('path')
const express = require('express')
const router = express.Router()
const { executeCommand } = require('../rcon')

const OFFICIAL_MAPS = [
  'de_ancient', 'de_anubis', 'de_dust2', 'de_inferno', 'de_mirage',
  'de_nuke', 'de_overpass', 'de_train', 'de_vertigo',
  'cs_italy', 'cs_office'
]

function cleanMapName(value) {
  return String(value || '').trim().replace(/\.(bsp|vpk)$/i, '')
}

function isSafeMapName(value) {
  return /^[a-zA-Z0-9_\-/]+$/.test(value)
}

function isWorkshopId(value) {
  return /^\d{6,20}$/.test(String(value || '').trim())
}

function envMaps() {
  return String(process.env.ADMINPLUS_MAPS || '')
    .split(',')
    .map(cleanMapName)
    .filter(Boolean)
    .filter(isSafeMapName)
}

function parseMapsOutput(raw) {
  const maps = new Set()
  for (const match of String(raw || '').matchAll(/([a-zA-Z0-9_\-/]+)\.bsp/g)) {
    const map = cleanMapName(match[1])
    if (isSafeMapName(map)) maps.add(map)
  }
  return [...maps].sort()
}

function candidateMapDirs() {
  const configured = String(process.env.ADMINPLUS_MAP_DIRS || '')
    .split(',')
    .map(v => v.trim())
    .filter(Boolean)

  const dirs = [...configured]
  const uid = typeof process.getuid === 'function' ? process.getuid() : null
  const gvfsRoot = uid !== null ? `/run/user/${uid}/gvfs` : null

  if (gvfsRoot && fs.existsSync(gvfsRoot)) {
    for (const entry of fs.readdirSync(gvfsRoot, { withFileTypes: true })) {
      if (entry.isDirectory()) dirs.push(path.join(gvfsRoot, entry.name, 'maps'))
    }
  }

  dirs.push(path.resolve(process.cwd(), '../maps'))
  return [...new Set(dirs)]
}

function discoverMapFiles() {
  const maps = new Set()
  const allowedPrefixes = /^(de_|cs_|ar_)/i

  for (const dir of candidateMapDirs()) {
    try {
      if (!fs.existsSync(dir)) continue
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        if (!entry.isFile()) continue
        const ext = path.extname(entry.name).toLowerCase()
        if (ext !== '.vpk' && ext !== '.bsp') continue

        const map = cleanMapName(path.basename(entry.name))
        if (!allowedPrefixes.test(map)) continue
        if (/_vanity$/i.test(map)) continue
        if (isSafeMapName(map)) maps.add(map)
      }
    } catch (err) {
      console.warn(`[Maps] file discovery skipped ${dir}:`, err.message)
    }
  }

  return [...maps].sort()
}

// POST /api/server/restartround
router.post('/restartround', async (req, res) => {
  try {
    await executeCommand('mp_restartgame 1')
    res.json({ ok: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// POST /api/server/endmatch
router.post('/endmatch', async (req, res) => {
  try {
    await executeCommand('mp_endmatch_votenextmap 0; mp_endmatch 1')
    res.json({ ok: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// POST /api/server/warmup
router.post('/warmup', async (req, res) => {
  try {
    await executeCommand('mp_warmup_start')
    res.json({ ok: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})


// GET /api/server/maps — official, configured, and server-discovered maps.
router.get('/maps', async (req, res) => {
  const discovered = []
  try {
    discovered.push(...parseMapsOutput(await executeCommand('maps *')))
  } catch (err) {
    console.warn('[Maps] discovery failed:', err.message)
  }

  const files = discoverMapFiles()
  const maps = [...new Set([...OFFICIAL_MAPS, ...envMaps(), ...files, ...discovered])].sort()
  res.json({ maps, official: OFFICIAL_MAPS, configured: envMaps(), files, discovered })
})

// POST /api/server/changelevel { map, mode }
router.post('/changelevel', async (req, res) => {
  const map = cleanMapName(req.body.map)
  const mode = String(req.body.mode || '').trim()
  if (!map) return res.status(400).json({ error: 'map required' })

  try {
    if (mode === 'workshop' || isWorkshopId(map)) {
      if (!isWorkshopId(map)) return res.status(400).json({ error: 'valid workshop id required' })
      await executeCommand(`host_workshop_map ${map}`)
      return res.json({ ok: true, command: 'host_workshop_map' })
    }

    if (!isSafeMapName(map)) return res.status(400).json({ error: 'invalid map name' })
    await executeCommand(`changelevel ${map}`)
    res.json({ ok: true, command: 'changelevel' })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// POST /api/server/givemoney/all { amount }
router.post('/givemoney/all', async (req, res) => {
  const { amount } = req.body
  if (amount === undefined) return res.status(400).json({ error: 'amount required' })
  try {
    await executeCommand(`sm_givemoney_all ${amount}`)
    res.json({ ok: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// POST /api/server/giveweapon/all { weapon }
router.post('/giveweapon/all', async (req, res) => {
  const { weapon } = req.body
  if (!weapon) return res.status(400).json({ error: 'weapon required' })
  try {
    await executeCommand(`sm_giveweapon_all weapon_${weapon}`)
    res.json({ ok: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// POST /api/server/cvar { key, value } — set any cvar
router.post('/cvar', async (req, res) => {
  const { key, value } = req.body
  if (!key || value === undefined) return res.status(400).json({ error: 'key and value required' })
  try {
    await executeCommand(`${key} ${value}`)
    res.json({ ok: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

module.exports = router
