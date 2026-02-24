import { useId } from 'react'
import clsx from 'clsx'
import { AlertCircle } from 'lucide-react'

interface FormFieldProps {
  label?: string
  error?: string
  helperText?: string
  required?: boolean
  children: React.ReactNode
  className?: string
}

export function FormField({
  label,
  error,
  helperText,
  required = false,
  children,
  className
}: FormFieldProps): React.JSX.Element {
  const id = useId()
  const errorId = `${id}-error`
  const helperId = `${id}-helper`

  return (
    <div className={clsx('flex flex-col gap-1.5', className)}>
      {label && (
        <label className="text-sm font-medium text-text-primary select-none">
          {label}
          {required && (
            <span className="text-accent ml-0.5" aria-label="required">
              *
            </span>
          )}
        </label>
      )}
      <div
        aria-describedby={error ? errorId : helperText ? helperId : undefined}
      >
        {children}
      </div>
      {error && (
        <p
          id={errorId}
          role="alert"
          className="flex items-center gap-1.5 text-xs text-danger"
        >
          <AlertCircle size={13} strokeWidth={2} />
          {error}
        </p>
      )}
      {!error && helperText && (
        <p id={helperId} className="text-xs text-text-tertiary">
          {helperText}
        </p>
      )}
    </div>
  )
}
