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
      <div className="flex flex-col gap-1.5">
        {label && (
          <label
            htmlFor={id}
            className="text-sm font-medium text-text-primary select-none"
          >
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={id}
          aria-invalid={!!error}
          aria-describedby={error ? errorId : helperText ? helperId : undefined}
          className={clsx(
            'w-full bg-bg-elevated text-text-primary rounded-md font-sans',
            'border px-3 py-2 text-sm leading-relaxed',
            'transition-all duration-200',
            'placeholder:text-text-tertiary',
            error
              ? 'border-danger focus:border-danger focus:shadow-[0_0_0_3px_rgba(217,48,54,0.1)]'
              : 'border-border-primary hover:border-border-secondary focus:border-accent focus:shadow-[0_0_0_3px_var(--color-accent-muted)]',
            'focus:outline-none',
            'disabled:bg-bg-secondary disabled:text-text-tertiary disabled:cursor-not-allowed',
            className
          )}
          {...props}
        />
        {error && (
          <p id={errorId} className="flex items-center gap-1.5 text-xs text-danger">
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
)

Input.displayName = 'Input'
