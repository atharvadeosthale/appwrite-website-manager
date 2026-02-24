import clsx from 'clsx'

interface CardProps {
  children: React.ReactNode
  className?: string
  onClick?: () => void
}

export function Card({ children, className, onClick }: CardProps): React.JSX.Element {
  const isClickable = !!onClick

  const Component = isClickable ? 'button' : 'div'

  return (
    <Component
      onClick={onClick}
      className={clsx(
        'bg-bg-elevated rounded-lg shadow-sm',
        'border border-border-primary',
        'p-5',
        'text-left w-full',
        isClickable && [
          'cursor-pointer',
          'transition-all duration-200',
          'hover:shadow-md hover:border-border-secondary',
          'hover:-translate-y-0.5',
          'active:translate-y-0 active:shadow-sm',
          'focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2'
        ],
        className
      )}
    >
      {children}
    </Component>
  )
}
