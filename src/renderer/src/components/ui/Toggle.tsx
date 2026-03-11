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
    <div className="inline-flex items-center gap-3">
      <button
        id={id}
        role="switch"
        type="button"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={clsx(
          'relative inline-flex h-6.5 w-11 shrink-0 items-center rounded-full border border-white/12 p-[3px]',
          'transition-all duration-200 ease-out cursor-pointer',
          'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/20',
          checked
            ? 'bg-[linear-gradient(180deg,rgba(40,40,45,0.98),rgba(23,23,27,0.98))] shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_2px_0_rgba(0,0,0,0.7)]'
            : 'bg-[linear-gradient(180deg,rgba(28,28,32,0.98),rgba(18,18,21,0.98))] shadow-[inset_0_1px_0_rgba(255,255,255,0.05),0_2px_0_rgba(0,0,0,0.6)]',
          disabled && 'cursor-not-allowed opacity-45'
        )}
      >
        <span
          className={clsx(
            'inline-block h-5 w-5 rounded-full border border-white/10 shadow-[0_5px_14px_rgba(0,0,0,0.32)] transition-transform duration-200',
            checked ? 'translate-x-[18px] bg-accent' : 'translate-x-0 bg-white'
          )}
        />
      </button>
      {label && (
        <label
          htmlFor={id}
          className={clsx('text-sm', disabled ? 'cursor-not-allowed text-text-tertiary' : 'cursor-pointer text-text-secondary')}
        >
          {label}
        </label>
      )}
    </div>
  )
}
