import { type InputHTMLAttributes, forwardRef, useId } from 'react'
import clsx from 'clsx'
import { AlertCircle } from 'lucide-react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  helperText?: string
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, helperText, className, id: externalId, ...props }, ref) => {
    const generatedId = useId()
    const id = externalId ?? generatedId
    const errorId = `${id}-error`
    const helperId = `${id}-helper`

    return (
      <div className="flex flex-col gap-2">
        {label && (
          <label htmlFor={id} className="text-xs font-medium uppercase tracking-[0.18em] text-text-tertiary">
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={id}
          aria-invalid={!!error}
          aria-describedby={error ? errorId : helperText ? helperId : undefined}
          className={clsx(
            'w-full rounded-[12px] border px-4 py-2.5 text-sm text-text-primary',
            'bg-[linear-gradient(180deg,rgba(23,23,27,0.94),rgba(15,15,18,0.88))]',
            'shadow-[inset_0_1px_0_rgba(255,255,255,0.02)] transition-all duration-200',
            'placeholder:text-text-tertiary',
            error
              ? 'border-danger/45 focus:border-danger focus:shadow-[0_0_0_3px_rgba(255,140,140,0.12)]'
              : 'border-white/10 hover:border-white/16 focus:border-white/18 focus:shadow-[0_0_0_3px_rgba(255,255,255,0.05)]',
            'focus:outline-none disabled:cursor-not-allowed disabled:border-white/8 disabled:bg-white/[0.03] disabled:text-text-tertiary',
            className
          )}
          {...props}
        />
        {error && (
          <p id={errorId} className="flex items-center gap-1.5 text-xs text-danger">
            <AlertCircle size={13} strokeWidth={1.9} />
            {error}
          </p>
        )}
        {!error && helperText && <p id={helperId} className="text-xs text-text-tertiary">{helperText}</p>}
      </div>
    )
  }
)

Input.displayName = 'Input'
