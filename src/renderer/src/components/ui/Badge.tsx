import clsx from 'clsx'

type BadgeVariant = 'default' | 'success' | 'warning' | 'danger' | 'accent'

interface BadgeProps {
  variant?: BadgeVariant
  children: React.ReactNode
}

const variantStyles: Record<BadgeVariant, string> = {
  default: 'border-white/10 bg-white/[0.04] text-text-secondary',
  success: 'border-success/20 bg-success-muted text-success',
  warning: 'border-warning/24 bg-warning-muted text-warning',
  danger: 'border-danger/24 bg-danger-muted text-danger',
  accent: 'border-accent/20 bg-accent-muted text-accent'
}

export function Badge({ variant = 'default', children }: BadgeProps): React.JSX.Element {
  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em]',
        variantStyles[variant]
      )}
    >
      {children}
    </span>
  )
}
