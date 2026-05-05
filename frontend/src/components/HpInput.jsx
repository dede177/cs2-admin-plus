import { useState, useRef, useEffect } from 'react'

const PRESETS = [1, 25, 50, 100, 200]

export default function HpInput({ onSet }) {
  const [open, setOpen]   = useState(false)
  const [hp, setHp]       = useState('100')
  const [pos, setPos]     = useState({ top: 0, left: 0 })
  const btnRef            = useRef(null)
  const menuRef           = useRef(null)
  const inputRef          = useRef(null)

  function toggle(e) {
    e.stopPropagation()
    if (!open && btnRef.current) {
      const r = btnRef.current.getBoundingClientRect()
      setPos({ top: r.bottom + 6, left: r.left })
    }
    setOpen(o => !o)
  }

  useEffect(() => { if (open && inputRef.current) inputRef.current.focus() }, [open])

  useEffect(() => {
    if (!open) return
    function handler(e) {
      if (menuRef.current && !menuRef.current.contains(e.target) &&
          btnRef.current  && !btnRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  function submit(e) {
    e?.stopPropagation()
    const val = parseInt(hp)
    if (!isNaN(val) && val > 0) { onSet(Math.min(val, 500)); setOpen(false) }
  }

  return (
    <>
      <button ref={btnRef} onMouseDown={e => e.stopPropagation()} onClick={toggle} style={{
        fontFamily:"'Share Tech Mono',monospace", fontSize:10, padding:'4px 8px',
        borderRadius:4, cursor:'pointer',
        border:`1px solid ${open ? '#ff454540' : '#ffffff28'}`,
        background: open ? '#ff454510' : 'transparent',
        color: open ? '#ff4545' : '#8a909c', letterSpacing:'0.06em',
      }}>SET HP</button>

      {open && (
        <div ref={menuRef} onMouseDown={e => e.stopPropagation()} style={{
          position:'fixed', top: pos.top, left: pos.left,
          background:'#13161b', border:'1px solid #ffffff28',
          borderRadius:8, padding:10, zIndex:9999,
          width:160, boxShadow:'0 8px 32px #000000cc',
          fontFamily:"'Share Tech Mono',monospace",
        }}>
          <div style={{ display:'flex', gap:5, marginBottom:8 }}>
            <input ref={inputRef} type="number" min={1} max={500} value={hp}
              onChange={e => setHp(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && submit()}
              style={{ flex:1, fontFamily:"'Share Tech Mono',monospace", fontSize:12,
                padding:'5px 8px', borderRadius:5, border:'1px solid #ffffff18',
                background:'#1a1e26', color:'#e8eaf0', outline:'none' }} />
            <button onClick={submit} style={{
              fontFamily:"'Share Tech Mono',monospace", fontSize:11,
              padding:'5px 8px', borderRadius:5, cursor:'pointer',
              border:'1px solid #ff454540', background:'#ff454515', color:'#ff4545',
            }}>SET</button>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:4 }}>
            {PRESETS.map(v => (
              <button key={v} onClick={e => { e.stopPropagation(); onSet(v); setOpen(false) }} style={{
                fontFamily:"'Share Tech Mono',monospace", fontSize:10, padding:'4px 2px',
                borderRadius:4, cursor:'pointer', border:'1px solid #ffffff0f',
                background:'#1a1e26', color:'#8a909c', textAlign:'center',
              }}
              onMouseEnter={e => { e.currentTarget.style.color='#ff4545'; e.currentTarget.style.borderColor='#ff454530' }}
              onMouseLeave={e => { e.currentTarget.style.color='#8a909c'; e.currentTarget.style.borderColor='#ffffff0f' }}>
                {v}
              </button>
            ))}
          </div>
        </div>
      )}
    </>
  )
}
