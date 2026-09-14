const FALLBACK_AVATARS = [
  'avatar_sub_02_psd.png',
  'avatar_sub_03_psd.png',
  'avatar_sub_04_psd.png',
  'avatar_sub_05_psd.png',
  'avatar_sub_06_psd.png',
  'avatar_sub_07_psd.png',
  'avatar_sub_08_psd.png',
  'avatar_sub_09_psd.png',
  'avatar_sub_10_psd.png',
  'avatar_sub_11_psd.png',
  'avatar_sub_12_psd.png',
  'avatar_sub_13_psd.png',
  'avatar_sub_14_psd.png',
  'avatar_sub_15_psd.png',
]

const fallbackAssignments = new Map()

function identityFor(player) {
  return String(player?.steamid || player?.userid || player?.name || 'player')
}

function assignFallback(identity, used) {
  const available = FALLBACK_AVATARS.filter((name) => !used.has(name))
  const pool = available.length ? available : FALLBACK_AVATARS
  const selected = pool[Math.floor(Math.random() * pool.length)]
  fallbackAssignments.set(identity, selected)
  return selected
}

export function withFallbackAvatars(players = []) {
  const activeIdentities = new Set(players.map(identityFor))
  for (const identity of fallbackAssignments.keys()) {
    if (!activeIdentities.has(identity)) fallbackAssignments.delete(identity)
  }

  const used = new Set(fallbackAssignments.values())
  return players.map((player) => ({
    ...player,
    ...(() => {
      const identity = identityFor(player)
      let fallbackName = fallbackAssignments.get(identity)
      if (!fallbackName) {
        fallbackName = assignFallback(identity, used)
        used.add(fallbackName)
      }
      const avatarFallback = `/fallback-avatars/${fallbackName}`
      return {
        avatarFallback,
        avatar: player.avatar || avatarFallback,
      }
    })(),
  }))
}

export function avatarBackgroundStyle(player) {
  const urls = [player?.avatar, player?.avatarFallback].filter(Boolean)
  const unique = [...new Set(urls)]
  return {
    backgroundImage: unique.map((url) => `url(${JSON.stringify(url)})`).join(', '),
  }
}
