const path = require('path')
const fs = require('fs')
require('dotenv').config({ path: path.resolve(__dirname, '../.env') })
const express = require('express')
const cors = require('cors')
const { createRconClient, executeCommand, getStatus } = require('./rcon')
const playerRoutes = require('./routes/players')
const serverRoutes = require('./routes/server')
const authMiddleware = require('./middleware/auth')

const app = express()
const frontendDist = path.resolve(__dirname, '../../frontend/dist')

app.use(cors({ origin: process.env.FRONTEND_URL || '*' }))
app.use(express.json())

// Health check (no auth needed)
app.get('/health', (req, res) => res.json({ ok: true }))

// Validate required env vars before attempting RCON
const missing = ['RCON_HOST', 'RCON_PORT', 'RCON_PASSWORD', 'API_SECRET'].filter(k => !process.env[k])
if (missing.length) {
  console.error('❌ Missing required .env variables:', missing.join(', '))
  console.error('   Copy backend/.env.example to backend/.env and fill in your values.')
  process.exit(1)
}

// Connect to RCON on startup
createRconClient().then(() => {
  console.log('✅ RCON connected to', process.env.RCON_HOST)
}).catch(err => {
  console.error('❌ RCON connection failed:', err.message)
  console.error('   Check RCON_HOST, RCON_PORT and RCON_PASSWORD in backend/.env')
})

// Auth middleware on all /api routes
app.use('/api', authMiddleware)

// Routes
app.use('/api/players', playerRoutes)
app.use('/api/server', serverRoutes)

// Generic RCON command (for power users)
app.post('/api/rcon', async (req, res) => {
  const { command } = req.body
  if (!command) return res.status(400).json({ error: 'command required' })
  try {
    const result = await executeCommand(command)
    res.json({ ok: true, result })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})


// Serve built frontend from the same process when frontend/dist exists.
if (fs.existsSync(frontendDist)) {
  app.use(express.static(frontendDist))
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api/')) return next()
    res.sendFile(path.join(frontendDist, 'index.html'))
  })
} else {
  console.warn('⚠️  frontend/dist not found; run `npm run build` from the repo root to serve the UI.')
}

const PORT = process.env.PORT || 3001
app.listen(PORT, () => console.log(`🚀 Admin Plus running on port ${PORT}`))
