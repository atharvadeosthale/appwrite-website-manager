import { useId } from 'react'
import clsx from 'clsx'

interface ToggleProps {
  checked: boolean
  onChange: (checked: boolean) => void
  label?: string
  disabled?: boolean
}

export function Toggle({ checked, onChange, label, disabled = false }: ToggleProps): React.JSX.Element {
  const id = useId()

  return (
    <div className="inline-flex items-center gap-2.5">
      <button
        id={id}
        role="switch"
        type="button"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={clsx(
          'relative inline-flex h-6 w-10 shrink-0 items-center',
          'rounded-full border-2 border-transparent',
          'transition-colors duration-200',
          'cursor-pointer',
          'focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2',
          checked ? 'bg-accent' : 'bg-bg-tertiary',
          disabled && 'opacity-50 cursor-not-allowed'
        )}
      >
        <span
          className={clsx(
            'inline-block h-4 w-4 rounded-full bg-white',
            'shadow-sm',
            'transition-transform duration-200',
            checked ? 'translate-x-[18px]' : 'translate-x-0.5'
          )}
        />
      </button>
      {label && (
        <label
          htmlFor={id}
          className={clsx(
            'text-sm select-none',
            disabled ? 'text-text-tertiary cursor-not-allowed' : 'text-text-primary cursor-pointer'
          )}
        >
          {label}
        </label>
      )}
    </div>
  )
}
