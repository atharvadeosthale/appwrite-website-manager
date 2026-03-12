import clsx from 'clsx'
import type { LucideIcon } from 'lucide-react'

interface PageScaffoldProps {
  children: React.ReactNode
  wide?: boolean
  className?: string
}

interface PageIntroProps {
  eyebrow?: string
  title: string
  description?: string
  actions?: React.ReactNode
  meta?: React.ReactNode
  titleClassName?: string
}

interface SurfaceCardProps {
  children: React.ReactNode
  className?: string
  highlight?: boolean
}

interface StatCardProps {
  icon: LucideIcon
  label: string
  value: string | number
  hint?: string
  accent?: 'accent' | 'cyan' | 'success' | 'warning'
  className?: string
}

interface EmptyStatePanelProps {
  icon: LucideIcon
  title: string
  description: string
  action?: React.ReactNode
  className?: string
}

const accentStyles = {
  accent: {
    panel: 'border-accent/16 bg-accent/[0.05]',
    icon: 'bg-accent-muted text-accent shadow-[0_18px_40px_rgba(255,92,143,0.18)]'
  },
  cyan: {
    panel: 'border-white/10 bg-white/[0.03]',
    icon: 'bg-cyan-muted text-cyan shadow-[0_16px_28px_rgba(0,0,0,0.2)]'
  },
  success: {
    panel: 'border-success/14 bg-success/[0.05]',
    icon: 'bg-success-muted text-success shadow-[0_18px_40px_rgba(57,208,176,0.18)]'
  },
  warning: {
    panel: 'border-warning/14 bg-warning/[0.05]',
    icon: 'bg-warning-muted text-warning shadow-[0_18px_40px_rgba(246,184,90,0.18)]'
  }
} as const

export function PageScaffold({ children, wide = false, className }: PageScaffoldProps): React.JSX.Element {
  return (
    <div className={clsx(wide ? 'page-shell-wide' : 'page-shell', 'animate-fade-in', className)}>
      {children}
    </div>
  )
}

export function PageIntro({
  eyebrow,
  title,
  description,
  actions,
  meta,
  titleClassName
}: PageIntroProps): React.JSX.Element {
  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
      <div className="max-w-3xl space-y-4">
        {eyebrow && <span className="panel-label">{eyebrow}</span>}
        <div className="space-y-3">
          <h1 className={clsx('page-heading text-text-primary', titleClassName)}>{title}</h1>
          {description && (
            <p className="max-w-2xl text-sm leading-6 text-text-secondary">
              {description}
            </p>
          )}
        </div>
        {meta && <div className="flex flex-wrap items-center gap-2">{meta}</div>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-3 lg:justify-end">{actions}</div>}
    </div>
  )
}

export function SurfaceCard({ children, className, highlight = false }: SurfaceCardProps): React.JSX.Element {
  return (
    <div
      className={clsx(
        'surface-panel ambient-card rounded-[18px] p-4 sm:p-5',
        highlight && 'surface-highlight',
        className
      )}
    >
      {children}
    </div>
  )
}

export function StatCard({
  icon: Icon,
  label,
  value,
  hint,
  accent = 'accent',
  className
}: StatCardProps): React.JSX.Element {
  const style = accentStyles[accent]

  return (
    <SurfaceCard
      className={clsx(
        'metric-tile overflow-hidden px-4 py-4',
        style.panel,
        className
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-text-tertiary">
            {label}
          </p>
          <p className="font-display text-2xl text-text-primary sm:text-3xl">{value}</p>
          {hint && <p className="text-xs leading-5 text-text-secondary">{hint}</p>}
        </div>
        <div className={clsx('flex h-10 w-10 items-center justify-center rounded-[12px] border border-white/6', style.icon)}>
          <Icon size={18} strokeWidth={1.9} />
        </div>
      </div>
    </SurfaceCard>
  )
}

export function EmptyStatePanel({
  icon: Icon,
  title,
  description,
  action,
  className
}: EmptyStatePanelProps): React.JSX.Element {
  return (
    <SurfaceCard className={clsx('flex flex-col items-center px-6 py-12 text-center', className)}>
      <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-[16px] bg-accent-muted text-accent shadow-[0_18px_34px_rgba(255,92,143,0.16)]">
        <Icon size={28} strokeWidth={1.9} />
      </div>
      <h2 className="font-display text-[1.75rem] text-text-primary">{title}</h2>
      <p className="mt-3 max-w-md text-sm leading-6 text-text-secondary">{description}</p>
      {action && <div className="mt-7">{action}</div>}
    </SurfaceCard>
  )
}

export function InfoPill({ children }: { children: React.ReactNode }): React.JSX.Element {
  return (
    <span className="inline-flex items-center gap-2 rounded-[12px] border border-white/10 bg-white/[0.03] px-2.5 py-1 text-[11px] font-medium text-text-secondary backdrop-blur-xl">
      {children}
    </span>
  )
}
