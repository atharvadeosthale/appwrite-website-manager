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
      <div className="flex flex-col gap-2">
        {label && (
          <label htmlFor={id} className="text-xs font-medium uppercase tracking-[0.18em] text-text-tertiary">
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
              'w-full appearance-none rounded-[12px] border px-4 py-2.5 pr-11 text-sm',
              'bg-[linear-gradient(180deg,rgba(23,23,27,0.94),rgba(15,15,18,0.88))] text-text-primary',
              'shadow-[inset_0_1px_0_rgba(255,255,255,0.02)] transition-all duration-200 cursor-pointer',
              error
                ? 'border-danger/45 focus:border-danger focus:shadow-[0_0_0_3px_rgba(255,140,140,0.12)]'
                : 'border-white/10 hover:border-white/16 focus:border-white/18 focus:shadow-[0_0_0_3px_rgba(255,255,255,0.05)]',
              'focus:outline-none disabled:cursor-not-allowed disabled:border-white/8 disabled:bg-white/[0.03] disabled:text-text-tertiary',
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
          <ChevronDown size={16} className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-text-tertiary" />
        </div>
        {error && (
          <p id={errorId} className="flex items-center gap-1.5 text-xs text-danger">
            <AlertCircle size={13} strokeWidth={1.9} />
            {error}
          </p>
        )}
      </div>
    )
  }
)

Select.displayName = 'Select'
