/* eslint-disable react-refresh/only-export-components */
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

const ToastContext = createContext<ToastContextValue | null>(null)

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext)
  if (!ctx) {
    throw new Error('useToast must be used within a ToastProvider')
  }
  return ctx
}

const typeConfig: Record<ToastType, { icon: typeof CheckCircle2; tint: string; iconColor: string }> = {
  success: {
    icon: CheckCircle2,
    tint: 'from-success/18 to-success/4',
    iconColor: 'text-success'
  },
  error: {
    icon: AlertCircle,
    tint: 'from-danger/20 to-danger/4',
    iconColor: 'text-danger'
  },
  warning: {
    icon: AlertTriangle,
    tint: 'from-warning/18 to-warning/4',
    iconColor: 'text-warning'
  },
  info: {
    icon: Info,
    tint: 'from-white/10 to-white/0',
    iconColor: 'text-text-primary'
  }
}

function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: (id: string) => void }): React.JSX.Element {
  const [isExiting, setIsExiting] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const config = typeConfig[toast.type]
  const Icon = config.icon

  const dismiss = useCallback(() => {
    setIsExiting(true)
    setTimeout(() => onDismiss(toast.id), 180)
  }, [onDismiss, toast.id])

  useEffect(() => {
    const duration = toast.duration ?? 4200
    timerRef.current = setTimeout(dismiss, duration)
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [dismiss, toast.duration])

  return (
    <div
      role="alert"
      className={clsx(
        'relative flex w-[22rem] items-start gap-3 overflow-hidden rounded-[16px] border border-white/10',
        'bg-gradient-to-br from-bg-secondary/95 to-bg-primary/95 px-4 py-4 shadow-[0_30px_70px_rgba(3,7,18,0.45)] backdrop-blur-2xl',
        isExiting ? 'translate-x-5 scale-95 opacity-0' : 'animate-slide-in-right opacity-100',
        'transition-all duration-200'
      )}
      onMouseEnter={() => {
        if (timerRef.current) clearTimeout(timerRef.current)
      }}
      onMouseLeave={() => {
        const duration = toast.duration ?? 4200
        timerRef.current = setTimeout(dismiss, duration)
      }}
    >
      <div className={clsx('pointer-events-none absolute inset-0 bg-gradient-to-br opacity-90', config.tint)} />
      <div className="relative z-10 mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.05]">
        <Icon size={18} className={config.iconColor} strokeWidth={1.9} />
      </div>
      <div className="relative z-10 flex-1">
        <p className="text-sm leading-6 text-text-primary">{toast.message}</p>
      </div>
      <button
        onClick={dismiss}
        className="relative z-10 rounded-xl p-1.5 text-text-tertiary transition-colors duration-150 hover:bg-white/[0.05] hover:text-text-primary"
        aria-label="Dismiss notification"
      >
        <X size={14} />
      </button>
    </div>
  )
}

let toastCounter = 0

export function ToastProvider({ children }: { children: ReactNode }): React.JSX.Element {
  const [toasts, setToasts] = useState<Toast[]>([])

  const addToast = useCallback((message: string, type: ToastType = 'info', duration?: number) => {
    const id = `toast-${++toastCounter}`
    setToasts((prev) => [...prev, { id, type, message, duration }])
  }, [])

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id))
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
      <div aria-live="polite" aria-label="Notifications" className="fixed bottom-5 right-5 z-50 flex flex-col-reverse gap-3">
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} onDismiss={removeToast} />
        ))}
      </div>
    </ToastContext.Provider>
  )
}
