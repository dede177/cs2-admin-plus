import { useState, useEffect, useCallback } from 'react'
import { getStatus } from '../api/rcon'

export function useServerStatus(intervalMs = 3000) {
  const [players, setPlayers] = useState([])
  const [map, setMap]         = useState('unknown')
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)

  const fetchStatus = useCallback(async () => {
    try {
      const data = await getStatus()
      setPlayers(data.players || [])
      setMap(data.map || 'unknown')
      setError(null)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchStatus()
    const interval = setInterval(fetchStatus, intervalMs)
    return () => clearInterval(interval)
  }, [fetchStatus, intervalMs])

  return { players, map, loading, error, refresh: fetchStatus }
}
