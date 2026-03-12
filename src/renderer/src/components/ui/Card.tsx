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
        'surface-panel ambient-card w-full rounded-[18px] p-4 text-left',
        isClickable && [
          'cursor-pointer transition-all duration-200 ease-out',
          'hover:-translate-y-0.5 hover:border-white/14 hover:shadow-[0_18px_40px_rgba(0,0,0,0.32)]',
          'active:translate-y-0 active:shadow-[0_10px_28px_rgba(0,0,0,0.24)]',
          'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/20'
        ],
        className
      )}
    >
      {children}
    </Component>
  )
}
