const express = require('express')
const router = express.Router()
const { executeCommand, getStatus, getPlayerInfo } = require('../rcon')

// GET /api/players — returns parsed player list from "status"
router.get('/', async (req, res) => {
  try {
    const status = await getPlayerInfo()
    res.json(status)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// POST /api/players/respawn { userid }
router.post('/respawn', async (req, res) => {
  const { userid } = req.body
  if (!userid) return res.status(400).json({ error: 'userid required' })
  try {
    await executeCommand(`sm_respawn ${userid}`)
    res.json({ ok: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// POST /api/players/setteam { userid, team: 'ct'|'t'|'spec' }
router.post('/setteam', async (req, res) => {
  const { userid, team } = req.body
  if (!userid || !team) return res.status(400).json({ error: 'userid and team required' })
  if (!['ct', 't', 'spec'].includes(team)) return res.status(400).json({ error: 'team must be ct, t, or spec' })
  try {
    await executeCommand(`sm_setteam ${userid} ${team}`)
    res.json({ ok: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// POST /api/players/givemoney { userid, amount }
router.post('/givemoney', async (req, res) => {
  const { userid, amount } = req.body
  if (!userid || amount === undefined) return res.status(400).json({ error: 'userid and amount required' })
  try {
    await executeCommand(`sm_givemoney ${userid} ${amount}`)
    res.json({ ok: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// POST /api/players/giveweapon { userid, weapon }
router.post('/giveweapon', async (req, res) => {
  const { userid, weapon } = req.body
  if (!userid || !weapon) return res.status(400).json({ error: 'userid and weapon required' })
  try {
    await executeCommand(`sm_giveweapon ${userid} weapon_${weapon}`)
    res.json({ ok: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// POST /api/players/sethp { userid, hp }
router.post('/sethp', async (req, res) => {
  const { userid, hp } = req.body
  if (!userid || hp === undefined) return res.status(400).json({ error: 'userid and hp required' })
  try {
    await executeCommand(`sm_sethp ${userid} ${hp}`)
    res.json({ ok: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// POST /api/players/freeze { userid }
router.post('/freeze', async (req, res) => {
  const { userid } = req.body
  if (!userid) return res.status(400).json({ error: 'userid required' })
  try {
    await executeCommand(`sm_freeze ${userid}`)
    res.json({ ok: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// POST /api/players/unfreeze { userid }
router.post('/unfreeze', async (req, res) => {
  const { userid } = req.body
  if (!userid) return res.status(400).json({ error: 'userid required' })
  try {
    await executeCommand(`sm_unfreeze ${userid}`)
    res.json({ ok: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// POST /api/players/stripweapons { userid }
router.post('/stripweapons', async (req, res) => {
  const { userid } = req.body
  if (!userid) return res.status(400).json({ error: 'userid required' })
  try {
    await executeCommand(`sm_stripweapons ${userid}`)
    res.json({ ok: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// POST /api/players/god { userid }
router.post('/god', async (req, res) => {
  const { userid } = req.body
  if (!userid) return res.status(400).json({ error: 'userid required' })
  try {
    await executeCommand(`sm_god ${userid}`)
    res.json({ ok: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// POST /api/players/slap { userid, damage }
router.post('/slap', async (req, res) => {
  const { userid, damage = 0 } = req.body
  if (!userid) return res.status(400).json({ error: 'userid required' })
  try {
    await executeCommand(`sm_slap ${userid} ${damage}`)
    res.json({ ok: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// POST /api/players/kick { userid }
router.post('/kick', async (req, res) => {
  const { userid } = req.body
  if (!userid) return res.status(400).json({ error: 'userid required' })
  try {
    await executeCommand(`kickid ${userid}`)
    res.json({ ok: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

module.exports = router
