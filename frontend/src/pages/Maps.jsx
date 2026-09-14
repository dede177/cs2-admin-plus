import { useEffect, useMemo, useState } from 'react'
import * as api from '../api/rcon'
import { Button, Field, Modal } from '../components/ui.jsx'
import Cs2Icon from '../components/Cs2Icon.jsx'
import { mapBackgroundFor, mapIconFor } from '../lib/mapAssets.js'

const DEMO_MODE = import.meta.env.VITE_DEMO_MODE === 'true'

const FALLBACK_MAPS = ['de_mirage', 'de_inferno', 'de_dust2', 'de_nuke', 'de_ancient', 'de_anubis', 'de_vertigo', 'de_breach']

function titleFor(map) {
  return String(map).replace(/^de_/, '').replace(/^cs_/, '').replace(/_/g, ' ').replace(/\b\w/g, (m) => m.toUpperCase()).replace('Dust2', 'Dust II')
}

export default function Maps({ currentMap, onRun }) {
  const [maps, setMaps] = useState(FALLBACK_MAPS)
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(() => !DEMO_MODE)
  const [busy, setBusy] = useState('')
  const [tab, setTab] = useState('installed')
  const [filter, setFilter] = useState('all')
  const [workshopOpen, setWorkshopOpen] = useState(false)
  const [customMap, setCustomMap] = useState('')

  useEffect(() => {
    if (DEMO_MODE) return undefined
    let active = true
    api.getMaps().then((data) => {
      if (active && data.maps?.length) setMaps(data.maps)
    }).catch(() => {}).finally(() => active && setLoading(false))
    return () => { active = false }
  }, [])

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase()
    return maps.filter((map) => {
      const matchesQuery = !needle || map.toLowerCase().includes(needle)
      const matchesFilter = filter === 'all' || map.startsWith(`${filter}_`)
      return matchesQuery && matchesFilter
    }).slice(0, 120)
  }, [maps, query, filter])

  async function load(map, mode) {
    const key = `${mode || 'map'}:${map}`
    setBusy(key)
    try {
      await onRun(`${mode === 'workshop' ? 'Loaded workshop' : 'Changed map to'} ${map}`, () => api.changeLevel(map, mode))
      setWorkshopOpen(false)
      setCustomMap('')
    } finally {
      setBusy('')
    }
  }

  function submitCustom() {
    const value = customMap.trim()
    if (!value) return
    const workshop = /^\d{6,20}$/.test(value)
    if (!window.confirm(`${workshop ? 'Load Workshop map' : 'Change level to'} ${value}?`)) return
    load(value, workshop ? 'workshop' : undefined)
  }

  return (
    <div className="page-shell maps-page">
      <div className="maps-heading">
        <div><h1>Maps</h1><p>Manage installed maps and add from the Steam Workshop.</p></div>
        <Button tone="primary" onClick={() => setWorkshopOpen(true)}><Cs2Icon name="plus" size={13} /> Install from Workshop</Button>
      </div>

      <div className="maps-tabs">
        <button className={tab === 'installed' ? 'is-active' : ''} onClick={() => setTab('installed')}>Installed Maps</button>
        <button className={tab === 'workshop' ? 'is-active' : ''} onClick={() => setTab('workshop')}>Workshop</button>
      </div>

      {tab === 'installed' ? (
        <>
          <div className="maps-toolbar">
            <div className="toolbar__search"><span><Cs2Icon name="search" size={13} /></span><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search maps…" /></div>
            <select value={filter} onChange={(e) => setFilter(e.target.value)}><option value="all">All Maps</option><option value="de">Defusal</option><option value="cs">Hostage</option></select>
          </div>

          <div className="map-grid map-grid--reference">
            {visible.map((map) => {
              const active = map === currentMap
              return (
                <article className={`map-card map-card--reference ${active ? 'is-active' : ''}`} key={map}>
                  <div className="map-card__art" style={{ backgroundImage: `url(${mapBackgroundFor(map)})` }} />
                  <div className="map-card__body">
                    <div className="map-card__identity">
                      <img className="map-card__icon" src={mapIconFor(map)} alt="" aria-hidden="true" />
                      <div><strong>{titleFor(map)}</strong><code>{map}</code></div>
                    </div>
                    <button className="map-card__menu" aria-label={`Load ${map}`} disabled={busy === `map:${map}`} onClick={() => {
                      if (active || window.confirm(`Change level to ${map}?`)) load(map)
                    }}><Cs2Icon name="moreoptions" size={15} /></button>
                  </div>
                </article>
              )
            })}
            {!loading && visible.length === 0 && <div className="maps-empty">No maps match this filter.</div>}
          </div>
        </>
      ) : (
        <section className="workshop-inline">
          <div><h2>Steam Workshop</h2><p>Load by numeric Workshop ID or enter a custom map name.</p></div>
          <div className="workshop-inline__form">
            <Field label="Map name or Workshop ID"><input value={customMap} onChange={(e) => setCustomMap(e.target.value)} placeholder="3070244462 or de_cache" onKeyDown={(e) => e.key === 'Enter' && submitCustom()} /></Field>
            <Button tone="primary" onClick={submitCustom}>Install / Load</Button>
          </div>
        </section>
      )}

      {workshopOpen && (
        <Modal title="Install from Workshop" onClose={() => setWorkshopOpen(false)} width="520px">
          <div className="custom-map-form">
            <Field label="Map name or Workshop ID" hint="Numeric IDs use host_workshop_map; named maps use changelevel.">
              <input autoFocus value={customMap} onChange={(e) => setCustomMap(e.target.value)} placeholder="3070244462 or de_cache" onKeyDown={(e) => e.key === 'Enter' && submitCustom()} />
            </Field>
            <div className="confirm-actions"><Button onClick={() => setWorkshopOpen(false)}>Cancel</Button><Button tone="primary" onClick={submitCustom}>Install / Load</Button></div>
          </div>
        </Modal>
      )}
    </div>
  )
}
