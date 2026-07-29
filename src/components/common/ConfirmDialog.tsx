import { CircleAlert, X } from 'lucide-react'
import { useEffect, useRef, type ReactNode } from 'react'

export function ConfirmDialog({
  open,
  title,
  children,
  confirmLabel,
  cancelLabel,
  tone = 'primary',
  pending = false,
  onConfirm,
  onCancel,
}: {
  open: boolean
  title: string
  children: ReactNode
  confirmLabel: string
  cancelLabel: string
  tone?: 'primary' | 'danger'
  pending?: boolean
  onConfirm: () => void
  onCancel: () => void
}) {
  const dialogRef = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  }, [open])

  return (
    <dialog
      className="confirm-dialog"
      ref={dialogRef}
      onCancel={(event) => {
        event.preventDefault()
        if (!pending) onCancel()
      }}
      onClick={(event) => {
        if (event.target === dialogRef.current && !pending) onCancel()
      }}
    >
      <div className="confirm-dialog__card">
        <div className={`confirm-dialog__icon confirm-dialog__icon--${tone}`}>
          <CircleAlert aria-hidden="true" />
        </div>
        <button
          className="icon-button confirm-dialog__close"
          type="button"
          onClick={onCancel}
          disabled={pending}
          aria-label="Close confirmation"
        >
          <X aria-hidden="true" size={18} />
        </button>
        <h2>{title}</h2>
        <div className="confirm-dialog__content">{children}</div>
        <div className="confirm-dialog__actions">
          <button
            className="button button--quiet"
            type="button"
            onClick={onCancel}
            disabled={pending}
          >
            {cancelLabel}
          </button>
          <button
            className={`button button--${tone === 'danger' ? 'danger' : 'primary'}`}
            type="button"
            onClick={onConfirm}
            disabled={pending}
          >
            {pending && <span className="button__spinner" aria-hidden="true" />}
            {pending ? 'Updating…' : confirmLabel}
          </button>
        </div>
      </div>
    </dialog>
  )
}
