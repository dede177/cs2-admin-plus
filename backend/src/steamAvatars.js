const avatarCache = new Map()

const SUCCESS_TTL_MS = 30 * 60 * 1000
const FAILURE_TTL_MS = 60 * 1000
const REQUEST_TIMEOUT_MS = 2500

function decodeXml(value) {
  return value
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
}

function normalizeFullAvatar(url) {
  if (!url) return null
  const value = decodeXml(String(url).trim())

  try {
    const parsed = new URL(value)
    if (parsed.protocol !== 'https:') parsed.protocol = 'https:'

    if (/avatars\.(?:fastly\.)?steamstatic\.com$/i.test(parsed.hostname)) {
      parsed.pathname = parsed.pathname.replace(/(?:_medium|_full)?\.jpg$/i, '_full.jpg')
    }

    return parsed.toString()
  } catch {
    return null
  }
}

async function fetchAvatarFull(steamid) {
  const id = String(steamid || '').trim()
  if (!/^\d{16,20}$/.test(id) || id === '0') return null

  const cached = avatarCache.get(id)
  const now = Date.now()
  if (cached && cached.expiresAt > now) return cached.avatar

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)

  try {
    const response = await fetch(`https://steamcommunity.com/profiles/${encodeURIComponent(id)}?xml=1`, {
      headers: { 'User-Agent': 'CS2-Admin-Plus/1.0' },
      signal: controller.signal,
    })
    if (!response.ok) throw new Error(`Steam profile request failed (${response.status})`)

    const xml = await response.text()
    const match = xml.match(/<avatarFull>\s*<!\[CDATA\[(.*?)\]\]>\s*<\/avatarFull>/i)
      || xml.match(/<avatarFull>(.*?)<\/avatarFull>/i)
    const avatar = normalizeFullAvatar(match?.[1])

    avatarCache.set(id, { avatar, expiresAt: now + (avatar ? SUCCESS_TTL_MS : FAILURE_TTL_MS) })
    return avatar
  } catch {
    avatarCache.set(id, { avatar: null, expiresAt: now + FAILURE_TTL_MS })
    return null
  } finally {
    clearTimeout(timeout)
  }
}

async function enrichPlayersWithAvatars(players) {
  return Promise.all(players.map(async (player) => {
    if (!player.steamid || player.isBot) return player
    const avatar = await fetchAvatarFull(player.steamid)
    return avatar ? { ...player, avatar } : player
  }))
}

module.exports = { enrichPlayersWithAvatars, fetchAvatarFull, normalizeFullAvatar }
