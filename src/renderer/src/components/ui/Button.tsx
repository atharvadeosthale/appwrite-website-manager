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
    'bg-accent text-white',
    'hover:bg-accent-hover',
    'active:brightness-95',
    'shadow-sm hover:shadow-accent',
    'disabled:bg-accent/50 disabled:shadow-none'
  ),
  secondary: clsx(
    'bg-bg-secondary text-text-primary',
    'border border-border-primary',
    'hover:bg-bg-hover hover:border-border-secondary',
    'active:bg-bg-tertiary',
    'disabled:bg-bg-secondary/60 disabled:text-text-tertiary disabled:border-border-primary/50'
  ),
  danger: clsx(
    'bg-danger text-white',
    'hover:bg-danger/90',
    'active:bg-danger/80',
    'shadow-sm',
    'disabled:bg-danger/40 disabled:shadow-none'
  ),
  ghost: clsx(
    'bg-transparent text-text-secondary',
    'hover:bg-bg-hover hover:text-text-primary',
    'active:bg-bg-tertiary',
    'disabled:text-text-tertiary disabled:bg-transparent'
  )
}

const sizeStyles: Record<ButtonSize, string> = {
  sm: 'px-3 py-1.5 text-xs gap-1.5 rounded-sm',
  md: 'px-4 py-2 text-sm gap-2 rounded-md',
  lg: 'px-5 py-2.5 text-base gap-2.5 rounded-md'
}

const iconOnlySizeStyles: Record<ButtonSize, string> = {
  sm: 'p-1.5 rounded-sm',
  md: 'p-2 rounded-md',
  lg: 'p-2.5 rounded-md'
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
          'inline-flex items-center justify-center',
          'font-medium leading-none select-none',
          'transition-all duration-200',
          'cursor-pointer disabled:cursor-not-allowed',
          'focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2',
          variantStyles[variant],
          isIconOnly ? iconOnlySizeStyles[size] : sizeStyles[size],
          loading && 'relative',
          className
        )}
        {...props}
      >
        {loading && (
          <span className="absolute inset-0 flex items-center justify-center">
            <Spinner
              size={size === 'lg' ? 'md' : 'sm'}
              className={variant === 'secondary' || variant === 'ghost' ? 'text-text-secondary' : 'text-white'}
            />
          </span>
        )}
        <span
          className={clsx(
            'inline-flex items-center justify-center',
            isIconOnly ? '' : 'gap-inherit',
            loading && 'invisible'
          )}
          style={{ gap: 'inherit' }}
        >
          {Icon && <Icon size={iconSizes[size]} strokeWidth={2} />}
          {children}
        </span>
      </button>
    )
  }
)

Button.displayName = 'Button'
