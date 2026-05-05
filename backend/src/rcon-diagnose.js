const path = require('path')
require('dotenv').config({ path: path.resolve(__dirname, '../.env') })
const { createRconClient, executeCommand } = require('./rcon')

async function main() {
  const host = String(process.env.RCON_HOST || '').trim()
  const port = String(process.env.RCON_PORT || '').trim()
  const password = String(process.env.RCON_PASSWORD || '')

  console.log('RCON config:', {
    host: host ? '<set>' : '<missing>',
    port: port || '<missing>',
    password: password ? '<set>' : '<missing>',
    envPath: path.resolve(__dirname, '../.env'),
  })

  await createRconClient()
  console.log('RCON auth: ok')
  const status = await executeCommand('status')
  console.log('status response preview:')
  console.log(status.split('\n').slice(0, 12).join('\n'))
}

main().catch(err => {
  console.error('RCON diagnose failed:', err.message)
  process.exit(1)
})
