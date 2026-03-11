import { useState } from 'react'
import clsx from 'clsx'

type AvatarSize = 'sm' | 'md' | 'lg'

interface AuthorAvatarProps {
  src?: string
  name: string
  size?: AvatarSize
}

const sizeStyles: Record<AvatarSize, string> = {
  sm: 'h-8 w-8 text-[10px]',
  md: 'h-10 w-10 text-xs',
  lg: 'h-14 w-14 text-sm'
}

const bgColors = [
  'bg-accent-muted text-accent',
  'bg-cyan-muted text-cyan',
  'bg-success-muted text-success',
  'bg-warning-muted text-warning',
  'bg-white/[0.08] text-text-primary',
  'bg-white/[0.05] text-text-secondary'
]

function getColorForName(name: string): string {
  let hash = 0
  for (let index = 0; index < name.length; index += 1) {
    hash = name.charCodeAt(index) + ((hash << 5) - hash)
  }
  return bgColors[Math.abs(hash) % bgColors.length]
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return parts[0][0]?.toUpperCase() ?? '?'
  return `${parts[0][0] ?? ''}${parts[parts.length - 1][0] ?? ''}`.toUpperCase()
}

export function AuthorAvatar({ src, name, size = 'md' }: AuthorAvatarProps): React.JSX.Element {
  const [failedSrc, setFailedSrc] = useState<string | null>(null)
  const showImage = !!src && src !== failedSrc
  const colorClass = getColorForName(name)

  return (
    <div
      className={clsx(
        'relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full border border-white/10 shadow-[0_12px_24px_rgba(0,0,0,0.22)]',
        'font-semibold uppercase tracking-[0.14em] select-none',
        sizeStyles[size],
        !showImage && colorClass
      )}
      title={name}
    >
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.1),transparent_42%)]" />
      {showImage ? (
        <img src={src} alt={name} className="h-full w-full object-cover" onError={() => setFailedSrc(src ?? null)} />
      ) : (
        <span className="relative z-10">{getInitials(name)}</span>
      )}
    </div>
  )
}
