import clsx from 'clsx'

type BadgeVariant = 'default' | 'success' | 'warning' | 'danger' | 'accent'

interface BadgeProps {
  variant?: BadgeVariant
  children: React.ReactNode
}

const variantStyles: Record<BadgeVariant, string> = {
  default: 'bg-bg-tertiary text-text-secondary',
  success: 'bg-success-muted text-success',
  warning: 'bg-warning-muted text-warning',
  danger: 'bg-danger-muted text-danger',
  accent: 'bg-accent-muted text-accent'
}

export function Badge({ variant = 'default', children }: BadgeProps): React.JSX.Element {
  return (
    <span
      className={clsx(
        'inline-flex items-center',
        'px-2.5 py-0.5',
        'text-xs font-medium leading-relaxed',
        'rounded-full',
        'select-none',
        variantStyles[variant]
      )}
    >
      {children}
    </span>
  )
}
