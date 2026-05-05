import { useState, useRef, useEffect } from 'react'

export default function SlapInput({ onSlap }) {
  const [open, setOpen]   = useState(false)
  const [dmg, setDmg]     = useState('0')
  const [pos, setPos]     = useState({ top: 0, left: 0 })
  const btnRef            = useRef(null)
  const menuRef           = useRef(null)

  function toggle(e) {
    e.stopPropagation()
    if (!open && btnRef.current) {
      const r = btnRef.current.getBoundingClientRect()
      setPos({ top: r.bottom + 6, left: r.left })
    }
    setOpen(o => !o)
  }

  useEffect(() => {
    if (!open) return
    function handler(e) {
      if (menuRef.current && !menuRef.current.contains(e.target) &&
          btnRef.current  && !btnRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  function slap(damage, e) {
    e?.stopPropagation()
    onSlap(damage)
    setOpen(false)
  }

  return (
    <>
      <button ref={btnRef} onMouseDown={e => e.stopPropagation()} onClick={toggle} style={{
        fontFamily:"'Share Tech Mono',monospace", fontSize:10, padding:'4px 8px',
        borderRadius:4, cursor:'pointer',
        border:`1px solid ${open ? '#ffaa0040' : '#ffffff28'}`,
        background: open ? '#ffaa0010' : 'transparent',
        color: open ? '#ffaa00' : '#8a909c', letterSpacing:'0.06em',
      }}>SLAP</button>

      {open && (
        <div ref={menuRef} onMouseDown={e => e.stopPropagation()} style={{
          position:'fixed', top: pos.top, left: pos.left,
          background:'#13161b', border:'1px solid #ffffff28',
          borderRadius:8, padding:10, zIndex:9999,
          width:150, boxShadow:'0 8px 32px #000000cc',
          fontFamily:"'Share Tech Mono',monospace",
        }}>
          <div style={{ fontSize:9, color:'#454a54', letterSpacing:'0.12em', marginBottom:7 }}>DAMAGE</div>
          <div style={{ display:'flex', gap:5, marginBottom:8 }}>
            <input type="number" min={0} max={100} value={dmg}
              onChange={e => setDmg(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && slap(parseInt(dmg) || 0, e)}
              style={{ flex:1, fontFamily:"'Share Tech Mono',monospace", fontSize:12,
                padding:'5px 8px', borderRadius:5, border:'1px solid #ffffff18',
                background:'#1a1e26', color:'#e8eaf0', outline:'none' }} />
            <button onClick={e => slap(parseInt(dmg) || 0, e)} style={{
              fontFamily:"'Share Tech Mono',monospace", fontSize:11,
              padding:'5px 8px', borderRadius:5, cursor:'pointer',
              border:'1px solid #ffaa0040', background:'#ffaa0015', color:'#ffaa00',
            }}>GO</button>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:4 }}>
            {[0, 10, 25, 50, 99].map(v => (
              <button key={v} onClick={e => slap(v, e)} style={{
                fontFamily:"'Share Tech Mono',monospace", fontSize:10, padding:'4px 2px',
                borderRadius:4, cursor:'pointer', border:'1px solid #ffffff0f',
                background:'#1a1e26', color:'#8a909c', textAlign:'center',
              }}
              onMouseEnter={e => { e.currentTarget.style.color='#ffaa00'; e.currentTarget.style.borderColor='#ffaa0030' }}
              onMouseLeave={e => { e.currentTarget.style.color='#8a909c'; e.currentTarget.style.borderColor='#ffffff0f' }}>
                {v === 0 ? 'no dmg' : `${v} hp`}
              </button>
            ))}
          </div>
        </div>
      )}
    </>
  )
}
