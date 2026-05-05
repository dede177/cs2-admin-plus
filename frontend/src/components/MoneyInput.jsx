import { useState, useRef, useEffect } from 'react'

const PRESETS = [800, 3000, 5000, 16000]

export default function MoneyInput({ onGive }) {
  const [open, setOpen]     = useState(false)
  const [amount, setAmount] = useState('16000')
  const [pos, setPos]       = useState({ top: 0, left: 0 })
  const btnRef              = useRef(null)
  const menuRef             = useRef(null)
  const inputRef            = useRef(null)

  function toggle(e) {
    e.stopPropagation()
    if (!open && btnRef.current) {
      const r = btnRef.current.getBoundingClientRect()
      setPos({ top: r.bottom + 6, left: r.left })
    }
    setOpen(o => !o)
  }

  useEffect(() => {
    if (open && inputRef.current) inputRef.current.focus()
  }, [open])

  useEffect(() => {
    if (!open) return
    function handler(e) {
      if (
        menuRef.current && !menuRef.current.contains(e.target) &&
        btnRef.current  && !btnRef.current.contains(e.target)
      ) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  function submit(e) {
    e?.stopPropagation()
    const val = parseInt(amount)
    if (!isNaN(val) && val >= 0) { onGive(Math.min(val, 65535)); setOpen(false) }
  }

  function preset(v, e) {
    e.stopPropagation()
    onGive(v)
    setOpen(false)
  }

  return (
    <>
      <button ref={btnRef} onMouseDown={e => e.stopPropagation()} onClick={toggle} style={{
        fontFamily:"'Share Tech Mono',monospace", fontSize:10,
        padding:'4px 8px', borderRadius:4, cursor:'pointer',
        border:`1px solid ${open ? '#4cff9140' : '#ffffff28'}`,
        background: open ? '#4cff9110' : 'transparent',
        color: open ? '#4cff91' : '#8a909c', letterSpacing:'0.06em',
      }}>
        GIVE $
      </button>

      {open && (
        <div
          ref={menuRef}
          onMouseDown={e => e.stopPropagation()}
          style={{
            position:'fixed', top: pos.top, left: pos.left,
            background:'#13161b', border:'1px solid #ffffff28',
            borderRadius:8, padding:10, zIndex:9999,
            width:180, boxShadow:'0 8px 32px #000000cc',
            fontFamily:"'Share Tech Mono',monospace",
          }}
        >
          <div style={{ display:'flex', gap:5, marginBottom:8 }}>
            <div style={{ position:'relative', flex:1 }}>
              <span style={{ position:'absolute', left:8, top:'50%', transform:'translateY(-50%)', color:'#4cff91', fontSize:12, pointerEvents:'none' }}>$</span>
              <input
                ref={inputRef}
                type="number" min={0} max={65535}
                value={amount}
                onChange={e => setAmount(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') submit() }}
                style={{
                  width:'100%', fontFamily:"'Share Tech Mono',monospace",
                  fontSize:12, padding:'5px 8px 5px 18px',
                  borderRadius:5, border:'1px solid #ffffff18',
                  background:'#1a1e26', color:'#e8eaf0',
                  boxSizing:'border-box', outline:'none',
                }}
              />
            </div>
            <button onClick={submit} style={{
              fontFamily:"'Share Tech Mono',monospace", fontSize:11,
              padding:'5px 10px', borderRadius:5, cursor:'pointer',
              border:'1px solid #4cff9140', background:'#4cff9115', color:'#4cff91',
            }}>SET</button>
          </div>

          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:4 }}>
            {PRESETS.map(v => (
              <button key={v} onClick={e => preset(v, e)} style={{
                fontFamily:"'Share Tech Mono',monospace", fontSize:10,
                padding:'4px', borderRadius:4, cursor:'pointer',
                border:'1px solid #ffffff0f', background:'#1a1e26', color:'#8a909c',
              }}
              onMouseEnter={e => { e.currentTarget.style.color='#4cff91'; e.currentTarget.style.borderColor='#4cff9130' }}
              onMouseLeave={e => { e.currentTarget.style.color='#8a909c'; e.currentTarget.style.borderColor='#ffffff0f' }}>
                ${v.toLocaleString()}
              </button>
            ))}
          </div>
        </div>
      )}
    </>
  )
}
