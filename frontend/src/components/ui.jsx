import { useEffect, useRef } from 'react'
import Cs2Icon from './Cs2Icon.jsx'

export function Brand({ compact = false }) {
  if (compact) {
    return <img className="brand-image" src="/mockup-art/nav-logo.png" alt="CS2 Admin Plus" />
  }
  return (
    <div className="brand" aria-label="CS2 Admin Plus">
      <div className="brand__mark"><span>CS</span><strong>2</strong></div>
      <div className="brand__sub">ADMIN PLUS</div>
    </div>
  )
}

export function StatusDot({ state = 'online' }) {
  return <span className={`status-dot status-dot--${state}`} aria-hidden="true" />
}

export function Button({ children, tone = 'default', size = 'md', className = '', busy = false, ...props }) {
  return (
    <button className={`button button--${tone} button--${size} ${className}`} disabled={busy || props.disabled} {...props}>
      {busy && <span className="button__spinner" aria-hidden="true" />}
      <span>{children}</span>
    </button>
  )
}

export function IconButton({ label, children = <Cs2Icon name="moreoptions" size={14} />, className = '', ...props }) {
  return (
    <button className={`icon-button ${className}`} aria-label={label} title={label} {...props}>
      {children}
    </button>
  )
}

export function Panel({ title, subtitle, actions, children, className = '' }) {
  return (
    <section className={`panel ${className}`}>
      {(title || actions) && (
        <header className="panel__header">
          <div>
            {title && <h2 className="panel__title">{title}</h2>}
            {subtitle && <p className="panel__subtitle">{subtitle}</p>}
          </div>
          {actions && <div className="panel__actions">{actions}</div>}
        </header>
      )}
      <div className="panel__body">{children}</div>
    </section>
  )
}

export function Field({ label, hint, className = '', children }) {
  return (
    <label className={`field ${className}`}>
      <span className="field__label">{label}</span>
      {children}
      {hint && <span className="field__hint">{hint}</span>}
    </label>
  )
}

export function EmptyState({ title, children }) {
  return (
    <div className="empty-state">
      <div className="empty-state__icon"><Cs2Icon name="crosshair_circle" size={30} /></div>
      <strong>{title}</strong>
      {children && <span>{children}</span>}
    </div>
  )
}

export function Modal({ title, children, onClose, width = '560px' }) {
  const closeRef = useRef(null)
  useEffect(() => {
    closeRef.current?.focus()
    const onKey = (event) => {
      if (event.key === 'Escape') onClose?.()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose?.()}>
      <div className="modal" role="dialog" aria-modal="true" aria-label={title} style={{ maxWidth: width }}>
        <header className="modal__header">
          <h2>{title}</h2>
          <button ref={closeRef} className="modal__close" onClick={onClose} aria-label="Close"><Cs2Icon name="cancel" size={16} /></button>
        </header>
        <div className="modal__body">{children}</div>
      </div>
    </div>
  )
}

export function ConfirmDialog({ title, message, confirmLabel = 'Confirm', onConfirm, onCancel, danger = false }) {
  return (
    <Modal title={title} onClose={onCancel} width="440px">
      <p className="confirm-copy">{message}</p>
      <div className="confirm-actions">
        <Button onClick={onCancel}>Cancel</Button>
        <Button tone={danger ? 'danger' : 'primary'} onClick={onConfirm}>{confirmLabel}</Button>
      </div>
    </Modal>
  )
}
