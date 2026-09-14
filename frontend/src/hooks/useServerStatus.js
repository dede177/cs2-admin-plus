import { useCallback, useEffect, useMemo, useState } from 'react'
import { getStatus } from '../api/rcon'
import { demoServer } from '../mock/demoServer.js'
import { withFallbackAvatars } from '../lib/avatars.js'

const DEMO_MODE = import.meta.env.VITE_DEMO_MODE === 'true'

export function useServerStatus(intervalMs = 3000) {
  const [players, setPlayers] = useState(() => DEMO_MODE ? withFallbackAvatars(demoServer.players) : [])
  const [map, setMap] = useState(() => DEMO_MODE ? demoServer.map : 'unknown')
  const [meta, setMeta] = useState(() => DEMO_MODE ? demoServer.meta : {})
  const [loading, setLoading] = useState(() => !DEMO_MODE)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState(null)
  const [lastUpdated, setLastUpdated] = useState(() => DEMO_MODE ? Date.now() : null)

  const fetchStatus = useCallback(async ({ silent = false } = {}) => {
    if (DEMO_MODE) {
      setPlayers(withFallbackAvatars(demoServer.players))
      setMap(demoServer.map)
      setMeta(demoServer.meta)
      setError(null)
      setLoading(false)
      setRefreshing(false)
      setLastUpdated(Date.now())
      return demoServer
    }
    if (!silent) setRefreshing(true)
    try {
      const data = await getStatus()
      setPlayers(withFallbackAvatars(data.players || []))
      setMap(data.map || 'unknown')
      setMeta(data.meta || {})
      setError(null)
      setLastUpdated(Date.now())
      return data
    } catch (err) {
      setError(err?.message || 'Unable to reach the server')
      throw err
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    fetchStatus().catch(() => {})
    if (DEMO_MODE) return undefined
    const timer = setInterval(() => {
      fetchStatus({ silent: true }).catch(() => {})
    }, intervalMs)
    return () => clearInterval(timer)
  }, [fetchStatus, intervalMs])

  const connection = useMemo(() => {
    if (loading) return 'connecting'
    if (error) return lastUpdated ? 'stale' : 'offline'
    return 'online'
  }, [loading, error, lastUpdated])

  return {
    players,
    map,
    meta,
    loading,
    refreshing,
    error,
    lastUpdated,
    connection,
    refresh: fetchStatus,
  }
}
