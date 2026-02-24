import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode
} from 'react'
import clsx from 'clsx'
import { X, CheckCircle2, AlertCircle, AlertTriangle, Info } from 'lucide-react'

/* ─── Types ─── */

type ToastType = 'success' | 'error' | 'warning' | 'info'

interface Toast {
  id: string
  type: ToastType
  message: string
  duration?: number
}

interface ToastContextValue {
  toast: (message: string, type?: ToastType, duration?: number) => void
  success: (message: string, duration?: number) => void
  error: (message: string, duration?: number) => void
  warning: (message: string, duration?: number) => void
  info: (message: string, duration?: number) => void
}

/* ─── Context ─── */

const ToastContext = createContext<ToastContextValue | null>(null)

/* ─── Hook ─── */

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext)
  if (!ctx) {
    throw new Error('useToast must be used within a ToastProvider')
  }
  return ctx
}

/* ─── Toast visual config ─── */

const typeConfig: Record<
  ToastType,
  { icon: typeof CheckCircle2; bg: string; iconColor: string; border: string }
> = {
  success: {
    icon: CheckCircle2,
    bg: 'bg-bg-elevated',
    iconColor: 'text-success',
    border: 'border-l-success'
  },
  error: {
    icon: AlertCircle,
    bg: 'bg-bg-elevated',
    iconColor: 'text-danger',
    border: 'border-l-danger'
  },
  warning: {
    icon: AlertTriangle,
    bg: 'bg-bg-elevated',
    iconColor: 'text-warning',
    border: 'border-l-warning'
  },
  info: {
    icon: Info,
    bg: 'bg-bg-elevated',
    iconColor: 'text-accent',
    border: 'border-l-accent'
  }
}

/* ─── Single Toast Item ─── */

function ToastItem({
  toast,
  onDismiss
}: {
  toast: Toast
  onDismiss: (id: string) => void
}): React.JSX.Element {
  const [isExiting, setIsExiting] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const config = typeConfig[toast.type]
  const Icon = config.icon

  const dismiss = useCallback(() => {
    setIsExiting(true)
    setTimeout(() => onDismiss(toast.id), 200)
  }, [onDismiss, toast.id])

  useEffect(() => {
    const duration = toast.duration ?? 4000
    timerRef.current = setTimeout(dismiss, duration)
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [dismiss, toast.duration])

  return (
    <div
      role="alert"
      className={clsx(
        'flex items-start gap-3 w-80',
        'px-4 py-3',
        'rounded-md shadow-lg',
        'border border-border-primary border-l-[3px]',
        config.bg,
        config.border,
        'transition-all duration-200',
        isExiting
          ? 'opacity-0 translate-x-4 scale-95'
          : 'opacity-100 translate-x-0 scale-100 animate-slide-in-right'
      )}
      onMouseEnter={() => {
        if (timerRef.current) clearTimeout(timerRef.current)
      }}
      onMouseLeave={() => {
        const duration = toast.duration ?? 4000
        timerRef.current = setTimeout(dismiss, duration)
      }}
    >
      <Icon size={18} className={clsx('shrink-0 mt-0.5', config.iconColor)} />
      <p className="flex-1 text-sm text-text-primary leading-relaxed">{toast.message}</p>
      <button
        onClick={dismiss}
        className={clsx(
          'shrink-0 p-0.5 rounded-sm',
          'text-text-tertiary hover:text-text-secondary',
          'hover:bg-bg-hover',
          'transition-colors duration-150',
          'cursor-pointer'
        )}
        aria-label="Dismiss notification"
      >
        <X size={14} />
      </button>
    </div>
  )
}

/* ─── Provider ─── */

let toastCounter = 0

export function ToastProvider({ children }: { children: ReactNode }): React.JSX.Element {
  const [toasts, setToasts] = useState<Toast[]>([])

  const addToast = useCallback((message: string, type: ToastType = 'info', duration?: number) => {
    const id = `toast-${++toastCounter}`
    setToasts((prev) => [...prev, { id, type, message, duration }])
  }, [])

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const value: ToastContextValue = {
    toast: addToast,
    success: (msg, dur) => addToast(msg, 'success', dur),
    error: (msg, dur) => addToast(msg, 'error', dur),
    warning: (msg, dur) => addToast(msg, 'warning', dur),
    info: (msg, dur) => addToast(msg, 'info', dur)
  }

  return (
    <ToastContext.Provider value={value}>
      {children}
      {/* Toast container — fixed bottom-right */}
      <div
        aria-live="polite"
        aria-label="Notifications"
        className="fixed bottom-5 right-5 z-50 flex flex-col-reverse gap-2.5"
      >
        {toasts.map((t) => (
          <ToastItem key={t.id} toast={t} onDismiss={removeToast} />
        ))}
      </div>
    </ToastContext.Provider>
  )
}
