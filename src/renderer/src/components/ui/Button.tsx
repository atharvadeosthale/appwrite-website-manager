import { type ButtonHTMLAttributes, type ElementType, forwardRef } from 'react'
import clsx from 'clsx'
import { Spinner } from './Spinner'

type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost'
type ButtonSize = 'sm' | 'md' | 'lg'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  loading?: boolean
  icon?: ElementType
  children?: React.ReactNode
}

const variantStyles: Record<ButtonVariant, string> = {
  primary: clsx(
    'border border-[#ff7ea8] text-white',
    'bg-[linear-gradient(180deg,#ff7ea8_0%,#ff5c8f_55%,#f24e83_100%)]',
    'shadow-[inset_0_1px_0_rgba(255,255,255,0.28),0_2px_0_rgba(190,54,101,0.95),0_10px_22px_rgba(255,92,143,0.16)]',
    'hover:-translate-y-0.5 hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.32),0_2px_0_rgba(190,54,101,0.95),0_14px_26px_rgba(255,92,143,0.18)]',
    'active:translate-y-[1px] active:shadow-[inset_0_1px_0_rgba(255,255,255,0.18),0_1px_0_rgba(190,54,101,0.95)]',
    'disabled:border-accent/15 disabled:bg-accent/30 disabled:text-white/60 disabled:shadow-none'
  ),
  secondary: clsx(
    'border border-white/10 text-text-primary',
    'bg-[linear-gradient(180deg,rgba(38,39,44,0.98),rgba(22,23,27,0.98))]',
    'shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_2px_0_rgba(0,0,0,0.7)]',
    'hover:-translate-y-0.5 hover:border-white/16 hover:bg-[linear-gradient(180deg,rgba(42,43,49,0.98),rgba(24,25,30,0.98))]',
    'active:translate-y-[1px] active:shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_1px_0_rgba(0,0,0,0.7)]',
    'disabled:border-white/6 disabled:bg-white/[0.03] disabled:text-text-tertiary'
  ),
  danger: clsx(
    'border border-danger/25 text-white',
    'bg-[linear-gradient(135deg,rgba(255,140,140,0.92),rgba(255,112,112,0.88))]',
    'hover:-translate-y-0.5 hover:shadow-[0_22px_55px_rgba(255,140,140,0.18)]',
    'active:translate-y-0 active:brightness-95',
    'disabled:border-danger/10 disabled:bg-danger/25 disabled:text-white/60'
  ),
  ghost: clsx(
    'border border-transparent bg-transparent text-text-secondary shadow-none',
    'hover:border-white/8 hover:bg-white/[0.04] hover:text-text-primary',
    'active:bg-white/[0.06]',
    'disabled:text-text-tertiary disabled:hover:border-transparent disabled:hover:bg-transparent'
  )
}

const sizeStyles: Record<ButtonSize, string> = {
  sm: 'min-h-8 rounded-[10px] px-3 text-xs gap-1.5',
  md: 'min-h-9 rounded-[12px] px-4 text-sm gap-2',
  lg: 'min-h-10 rounded-[12px] px-[1.125rem] text-sm gap-2.5'
}

const iconOnlySizeStyles: Record<ButtonSize, string> = {
  sm: 'h-8 w-8 rounded-[10px]',
  md: 'h-9 w-9 rounded-[12px]',
  lg: 'h-10 w-10 rounded-[12px]'
}

const iconSizes: Record<ButtonSize, number> = {
  sm: 14,
  md: 16,
  lg: 18
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      loading = false,
      disabled,
      icon: Icon,
      children,
      className,
      type = 'button',
      ...props
    },
    ref
  ) => {
    const isIconOnly = Icon && !children
    const isDisabled = disabled || loading

    return (
      <button
        ref={ref}
        type={type}
        disabled={isDisabled}
        className={clsx(
          'group relative inline-flex items-center justify-center overflow-hidden',
          'font-medium tracking-[-0.015em] transition-all duration-200 ease-out',
          'cursor-pointer disabled:cursor-not-allowed disabled:translate-y-0',
          'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/20',
          variantStyles[variant],
          isIconOnly ? iconOnlySizeStyles[size] : sizeStyles[size],
          loading && 'text-transparent',
          className
        )}
        {...props}
      >
        {variant === 'primary' && !isDisabled && <span className="pointer-events-none absolute inset-x-0 top-0 h-px bg-white/40" />}
        {loading && (
          <span className="absolute inset-0 flex items-center justify-center text-white">
            <Spinner
              size={size === 'lg' ? 'md' : 'sm'}
              className={variant === 'ghost' || variant === 'secondary' ? 'text-text-primary' : 'text-white'}
            />
          </span>
        )}
        <span
          className={clsx(
            'relative z-10 inline-flex items-center justify-center',
            isIconOnly ? '' : 'gap-inherit',
            loading && 'opacity-0'
          )}
          style={{ gap: 'inherit' }}
        >
          {Icon && <Icon size={iconSizes[size]} strokeWidth={1.9} />}
          {children}
        </span>
      </button>
    )
  }
)

Button.displayName = 'Button'
