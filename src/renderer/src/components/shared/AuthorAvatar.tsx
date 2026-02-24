import { useState, useEffect } from 'react'
import clsx from 'clsx'

type AvatarSize = 'sm' | 'md' | 'lg'

interface AuthorAvatarProps {
  src?: string
  name: string
  size?: AvatarSize
}

const sizeStyles: Record<AvatarSize, string> = {
  sm: 'h-7 w-7 text-[10px]',
  md: 'h-9 w-9 text-xs',
  lg: 'h-12 w-12 text-sm'
}

// Deterministic warm palette for initials fallback
const bgColors = [
  'bg-accent-muted text-accent',
  'bg-success-muted text-success',
  'bg-warning-muted text-warning',
  'bg-[#EDE9FE] text-[#7C3AED]',
  'bg-[#E0F2FE] text-[#0284C7]',
  'bg-[#FEE2E2] text-[#DC2626]',
  'bg-[#ECFDF5] text-[#059669]',
  'bg-[#FFF7ED] text-[#EA580C]'
]

function getColorForName(name: string): string {
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash)
  }
  return bgColors[Math.abs(hash) % bgColors.length]
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return parts[0][0]?.toUpperCase() ?? '?'
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

export function AuthorAvatar({ src, name, size = 'md' }: AuthorAvatarProps): React.JSX.Element {
  const [imgError, setImgError] = useState(false)
  useEffect(() => { setImgError(false) }, [src])
  const showImage = src && !imgError
  const colorClass = getColorForName(name)

  return (
    <div
      className={clsx(
        'relative inline-flex items-center justify-center',
        'rounded-full overflow-hidden shrink-0',
        'font-medium select-none',
        sizeStyles[size],
        !showImage && colorClass
      )}
      title={name}
    >
      {showImage ? (
        <img
          src={src}
          alt={name}
          className="h-full w-full object-cover"
          onError={() => setImgError(true)}
        />
      ) : (
        <span>{getInitials(name)}</span>
      )}
    </div>
  )
}
