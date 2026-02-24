import clsx from 'clsx'

type SpinnerSize = 'sm' | 'md' | 'lg'

interface SpinnerProps {
  size?: SpinnerSize
  className?: string
}

const sizeStyles: Record<SpinnerSize, string> = {
  sm: 'h-3.5 w-3.5 border-[1.5px]',
  md: 'h-5 w-5 border-2',
  lg: 'h-7 w-7 border-2'
}

export function Spinner({ size = 'md', className }: SpinnerProps): React.JSX.Element {
  return (
    <span
      role="status"
      aria-label="Loading"
      className={clsx(
        'inline-block rounded-full',
        'border-current border-r-transparent',
        'animate-spin',
        sizeStyles[size],
        className ?? 'text-accent'
      )}
    />
  )
}
