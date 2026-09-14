import { useState } from 'react'
import * as api from '../api/rcon'
import { Button, Panel } from '../components/ui.jsx'
import Cs2Icon from '../components/Cs2Icon.jsx'

const QUICK_COMMANDS = [
  ['Status', 'status'],
  ['Restart round', 'mp_restartgame 1'],
  ['Pause match', 'mp_pause_match'],
  ['Unpause match', 'mp_unpause_match'],
  ['List plugins', 'css_plugins list'],
  ['List maps', 'maps *'],
]

export default function Console({ activity, onRun }) {
  const [command, setCommand] = useState('')
  const [busy, setBusy] = useState(false)
  const [output, setOutput] = useState([])

  async function execute(value = command) {
    const next = value.trim()
    if (!next || busy) return
    setBusy(true)
    setCommand('')
    try {
      const result = await onRun(`RCON: ${next}`, () => api.sendRcon(next))
      const text = typeof result?.result === 'string' ? result.result : JSON.stringify(result?.result ?? result ?? 'OK', null, 2)
      setOutput((prev) => [{ id: Date.now(), command: next, text, status: 'success', time: Date.now() }, ...prev].slice(0, 40))
    } catch (err) {
      setOutput((prev) => [{ id: Date.now(), command: next, text: err?.message || 'Command failed', status: 'error', time: Date.now() }, ...prev].slice(0, 40))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="page-shell console-page">
      <div className="page-heading">
        <div><span className="page-heading__eyebrow">POWER USER TOOLS</span><h1>Console</h1><p>Send raw RCON commands and inspect the results from this browser session.</p></div>
      </div>

      <div className="console-layout">
        <Panel title="RCON Console" subtitle="Commands are sent through the authenticated backend bridge." className="console-panel">
          <div className="console-input-row">
            <span className="console-prompt">rcon&gt;</span>
            <input
              value={command}
              onChange={(e) => setCommand(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') execute() }}
              placeholder="Enter command…"
              autoComplete="off"
            />
            <Button tone="primary" busy={busy} onClick={() => execute()}>Send</Button>
          </div>
          <div className="quick-command-row">
            {QUICK_COMMANDS.map(([label, value]) => <button key={label} onClick={() => execute(value)}>{label}</button>)}
          </div>
          <div className="console-output">
            {output.length === 0 ? (
              <div className="console-output__empty">No console commands sent yet.</div>
            ) : output.map((entry) => (
              <div className={`console-entry console-entry--${entry.status}`} key={entry.id}>
                <div className="console-entry__command"><time>{new Date(entry.time).toLocaleTimeString()}</time><span>rcon&gt;</span><strong>{entry.command}</strong></div>
                <pre>{entry.text || 'OK'}</pre>
              </div>
            ))}
          </div>
        </Panel>

        <Panel title="Session Activity" subtitle="Actions triggered through this Admin Plus session." className="activity-panel">
          <div className="activity-log">
            {activity.length === 0 ? <p>No activity yet.</p> : activity.map((item) => (
              <div className={`activity-log__row activity-log__row--${item.status}`} key={item.id}>
                <time>{new Date(item.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</time>
                <span className="activity-log__status"><Cs2Icon name={item.status === 'success' ? 'check' : 'alert'} size={12} /></span>
                <span>{item.label}</span>
                {item.detail && <small>{item.detail}</small>}
              </div>
            ))}
          </div>
        </Panel>
      </div>
    </div>
  )
}
