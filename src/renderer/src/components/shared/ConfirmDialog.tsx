import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { AlertTriangle } from 'lucide-react'
import { Button } from '../ui/Button'

interface ConfirmDialogProps {
  open: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  message: string
  confirmLabel?: string
  variant?: 'default' | 'danger'
}

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = 'Confirm',
  variant = 'default'
}: ConfirmDialogProps): React.JSX.Element | null {
  const cancelRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!open) return undefined
    const timer = setTimeout(() => cancelRef.current?.focus(), 50)
    return () => clearTimeout(timer)
  }, [open])

  useEffect(() => {
    if (!open) return
    const handleKeyDown = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [open, onClose])

  useEffect(() => {
    if (!open) return undefined
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = ''
    }
  }, [open])

  if (!open) return null

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="confirm-dialog-title" aria-describedby="confirm-dialog-message">
      <div className="fixed inset-0 bg-black/70 backdrop-blur-md animate-fade-in" onClick={onClose} />
      <div className="relative w-full max-w-md overflow-hidden rounded-[16px] border border-white/10 bg-[linear-gradient(180deg,rgba(26,26,30,0.98),rgba(12,12,14,0.98))] p-6 shadow-[0_30px_80px_rgba(3,7,18,0.52)] animate-scale-in">
        <div className="pointer-events-none absolute inset-x-10 top-0 h-px bg-gradient-to-r from-transparent via-white/14 to-transparent" />
        <div className="flex items-start gap-4">
          <div className={variant === 'danger' ? 'flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-danger/20 bg-danger-muted text-danger' : 'flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.05] text-text-primary'}>
            <AlertTriangle size={20} strokeWidth={1.9} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs uppercase tracking-[0.18em] text-text-tertiary">Confirmation</p>
            <h2 id="confirm-dialog-title" className="mt-2 font-display text-2xl text-text-primary">{title}</h2>
            <p id="confirm-dialog-message" className="mt-3 text-sm leading-7 text-text-secondary">{message}</p>
          </div>
        </div>
        <div className="mt-8 flex items-center justify-end gap-3">
          <Button ref={cancelRef} variant="secondary" size="md" onClick={onClose}>Cancel</Button>
          <Button
            variant={variant === 'danger' ? 'danger' : 'primary'}
            size="md"
            onClick={() => {
              onConfirm()
              onClose()
            }}
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>,
    document.body
  )
}
