import { useEffect, useRef, useState } from 'react'
import { MoreHorizontal } from 'lucide-react'

// A small dropdown. items: [{ label, onClick, danger }, { divider: true }]
export default function Menu({ items, label = 'More options', align = 'right', children, className = '' }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    if (!open) return
    const onDown = (e) => {
      if (!ref.current?.contains(e.target)) setOpen(false)
    }
    const onKey = (e) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('pointerdown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div className={'menu-wrap ' + className} ref={ref} onClick={(e) => e.stopPropagation()}>
      <button className={children ? 'menu-trigger' : 'icon-btn'} aria-label={label} aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        {children || <MoreHorizontal size={18} />}
      </button>
      {open && (
        <div className={'menu ' + align} role="menu">
          {items
            .filter(Boolean)
            .map((it, i) =>
              it.divider ? (
                <div key={i} className="menu-sep" />
              ) : it.heading ? (
                <div key={i} className="menu-heading">
                  {it.heading}
                </div>
              ) : (
                <button
                  key={i}
                  role="menuitem"
                  className={'menu-item' + (it.danger ? ' danger' : '')}
                  onClick={() => {
                    setOpen(false)
                    it.onClick?.()
                  }}
                >
                  {it.label}
                </button>
              )
            )}
        </div>
      )}
    </div>
  )
}
