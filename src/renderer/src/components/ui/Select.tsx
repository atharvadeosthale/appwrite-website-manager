import { type SelectHTMLAttributes, forwardRef, useId } from 'react'
import clsx from 'clsx'
import { AlertCircle, ChevronDown } from 'lucide-react'

interface SelectOption {
  value: string
  label: string
}

interface SelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'children'> {
  label?: string
  error?: string
  options: SelectOption[]
  placeholder?: string
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, options, placeholder, className, id: externalId, ...props }, ref) => {
    const generatedId = useId()
    const id = externalId ?? generatedId
    const errorId = `${id}-error`

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
        <div className="relative">
          <select
            ref={ref}
            id={id}
            aria-invalid={!!error}
            aria-describedby={error ? errorId : undefined}
            className={clsx(
              'w-full appearance-none bg-bg-elevated text-text-primary rounded-md font-sans',
              'border px-3 py-2 pr-9 text-sm leading-relaxed',
              'transition-all duration-200',
              'cursor-pointer',
              error
                ? 'border-danger focus:border-danger focus:shadow-[0_0_0_3px_rgba(217,48,54,0.1)]'
                : 'border-border-primary hover:border-border-secondary focus:border-accent focus:shadow-[0_0_0_3px_var(--color-accent-muted)]',
              'focus:outline-none',
              'disabled:bg-bg-secondary disabled:text-text-tertiary disabled:cursor-not-allowed',
              className
            )}
            {...props}
          >
            {placeholder && (
              <option value="" disabled>
                {placeholder}
              </option>
            )}
            {options.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <ChevronDown
            size={16}
            className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-text-tertiary"
          />
        </div>
        {error && (
          <p id={errorId} className="flex items-center gap-1.5 text-xs text-danger">
            <AlertCircle size={13} strokeWidth={2} />
            {error}
          </p>
        )}
      </div>
    )
  }
)

Select.displayName = 'Select'
