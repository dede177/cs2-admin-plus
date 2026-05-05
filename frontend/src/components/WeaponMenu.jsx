import { useState, useEffect, useRef } from 'react'

const WEAPON_ICONS = {
  ak47:'CS2_AK-47_Inventory.webp', aug:'CS2_AUG_Inventory.webp', awp:'CS2_AWP_Inventory.webp',
  cz75a:'CS2_CZ75-Auto_Inventory.webp', deagle:'CS2_Desert_Eagle_Inventory.webp',
  elite:'CS2_Dual_Berettas_Inventory.webp', famas:'CS2_FAMAS_Inventory.webp',
  fiveseven:'CS2_Five-SeveN_Inventory.webp', g3sg1:'CS2_G3SG1_Inventory.webp',
  galilar:'CS2_Galil_AR_Inventory.webp', glock:'CS2_Glock-18_Inventory.webp',
  m249:'CS2_M249_Inventory.webp', m4a1_silencer:'CS2_M4A1-S_Inventory.webp',
  m4a4:'CS2_M4A4_Inventory.webp', mac10:'CS2_MAC-10_Inventory.webp',
  mag7:'CS2_MAG-7_Inventory.webp', mp5sd:'CS2_MP5-SD_Inventory.webp',
  mp7:'CS2_MP7_Inventory.webp', mp9:'CS2_MP9_Inventory.webp',
  negev:'CS2_Negev_Inventory.webp', nova:'CS2_Nova_Inventory.webp',
  hkp2000:'CS2_P2000_Inventory.webp', p250:'CS2_P250_Inventory.webp',
  p90:'CS2_P90_Inventory.webp', bizon:'CS2_PP-Bizon_Inventory.webp',
  revolver:'CS2_R8_Revolver_Inventory.webp', sawedoff:'CS2_Sawed-Off_Inventory.webp',
  scar20:'CS2_SCAR-20_Inventory.webp', sg553:'CS2_SG_553_Inventory.webp',
  ssg08:'CS2_SSG_08_Inventory.webp', tec9:'CS2_Tec-9_Inventory.webp',
  ump45:'CS2_UMP-45_Inventory.webp', usp_silencer:'CS2_USP-S_Inventory.webp',
  xm1014:'CS2_XM1014_Inventory.webp', flashbang:'Flashbanghud_csgo.webp',
  smokegrenade:'Smokegrenadehud_csgo.webp', hegrenade:'Hegrenadehud_csgo.webp',
  molotov:'Molotovhud.webp', incgrenade:'Incgrenadehud_csgo.webp',
  decoy:'Decoyhud_csgo.webp', defuser:'Defuserhud_csgo.webp',
  assaultsuit:'Assaultsuithud_csgo.webp', taser:'CS2Taserhud.webp',
  healthshot:'Csgo_Weapon_healthshot.webp',
}

const CATEGORIES = {
  'Rifles':   ['ak47','m4a4','m4a1_silencer','galilar','famas','sg553','aug','ssg08','awp','g3sg1','scar20'],
  'Pistols':  ['glock','usp_silencer','hkp2000','p250','cz75a','deagle','revolver','tec9','fiveseven','elite'],
  'SMGs':     ['mp9','mac10','mp7','mp5sd','ump45','p90','bizon'],
  'Heavy':    ['nova','xm1014','mag7','sawedoff','m249','negev'],
  'Grenades': ['flashbang','smokegrenade','hegrenade','molotov','incgrenade','decoy'],
  'Gear':     ['assaultsuit','defuser','taser','healthshot'],
}

export default function WeaponMenu({ onSelect }) {
  const [open, setOpen] = useState(false)
  const [pos, setPos]   = useState({ top: 0, left: 0 })
  const btnRef          = useRef(null)
  const menuRef         = useRef(null)

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
      if (
        menuRef.current && !menuRef.current.contains(e.target) &&
        btnRef.current  && !btnRef.current.contains(e.target)
      ) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  function pick(w, e) {
    e.stopPropagation()
    setOpen(false)
    onSelect(w)
  }

  return (
    <>
      <button ref={btnRef} onMouseDown={e => e.stopPropagation()} onClick={toggle} style={{
        fontFamily:"'Share Tech Mono',monospace", fontSize:10,
        padding:'4px 8px', borderRadius:4, cursor:'pointer',
        border:`1px solid ${open ? '#ffffff45' : '#ffffff28'}`,
        background: open ? '#ffffff0f' : 'transparent',
        color:'#8a909c', letterSpacing:'0.06em',
      }}>
        WEAPON ▾
      </button>

      {open && (
        <div
          ref={menuRef}
          onMouseDown={e => e.stopPropagation()}
          style={{
            position:'fixed', top: pos.top, left: pos.left,
            background:'#13161b', border:'1px solid #ffffff28',
            borderRadius:10, padding:12, zIndex:9999,
            width:420, maxHeight:340, overflowY:'auto',
            boxShadow:'0 12px 48px #000000cc',
          }}
        >
          {Object.entries(CATEGORIES).map(([cat, weapons]) => (
            <div key={cat} style={{ marginBottom:12 }}>
              <div style={{ fontSize:9, fontWeight:700, letterSpacing:'0.16em', color:'#454a54', marginBottom:6, fontFamily:"'Share Tech Mono',monospace" }}>
                {cat}
              </div>
              <div style={{ display:'flex', flexWrap:'wrap', gap:4 }}>
                {weapons.map(w => <WeaponBtn key={w} weapon={w} onClick={e => pick(w, e)} />)}
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  )
}

function WeaponBtn({ weapon, onClick }) {
  const [hov, setHov] = useState(false)
  return (
    <button
      onClick={onClick}
      onMouseDown={e => e.stopPropagation()}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      title={weapon}
      style={{
        display:'flex', flexDirection:'column', alignItems:'center', gap:3,
        padding:'6px 8px', borderRadius:6, cursor:'pointer', width:68,
        border:`1px solid ${hov ? '#ffffff28' : '#ffffff0f'}`,
        background: hov ? '#20252f' : '#1a1e26', transition:'all .1s',
      }}
    >
      {WEAPON_ICONS[weapon]
        ? <img src={`/weapons/${WEAPON_ICONS[weapon]}`} alt={weapon} style={{ width:48, height:28, objectFit:'contain', filter: hov ? 'brightness(1.2)' : 'brightness(0.85)' }} />
        : <div style={{ width:48, height:28 }} />
      }
      <span style={{ fontSize:9, fontFamily:"'Share Tech Mono',monospace", color: hov ? '#e8eaf0' : '#8a909c', letterSpacing:'0.03em', textAlign:'center', lineHeight:1.2, wordBreak:'break-all' }}>
        {weapon}
      </span>
    </button>
  )
}
