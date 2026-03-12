import { useState, type DragEvent, type ElementType } from 'react'
import clsx from 'clsx'
import { Upload } from 'lucide-react'

interface FileDropZoneProps {
  accept?: string
  onFile: (path: string) => void
  label?: string
  icon?: ElementType
}

export function FileDropZone({
  accept,
  onFile,
  label = 'Drop a file here, or click to browse',
  icon: Icon = Upload
}: FileDropZoneProps): React.JSX.Element {
  const [isDragging, setIsDragging] = useState(false)

  const handleDragOver = (e: DragEvent<HTMLDivElement>): void => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }

  const handleDragLeave = (e: DragEvent<HTMLDivElement>): void => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }

  const handleDrop = (e: DragEvent<HTMLDivElement>): void => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)

    const file = e.dataTransfer.files[0]
    if (!file) return

    if (accept) {
      const extensions = accept.split(',').map((ext) => ext.trim().toLowerCase())
      const fileName = file.name.toLowerCase()
      const matches = extensions.some((ext) => fileName.endsWith(ext))
      if (!matches) return
    }

    const filePath = (file as File & { path?: string }).path
    if (filePath) {
      onFile(filePath)
    }
  }

  const handleClick = (): void => {
    const input = document.createElement('input')
    input.type = 'file'
    if (accept) input.accept = accept

    input.onchange = () => {
      const file = input.files?.[0]
      if (!file) return
      const filePath = (file as File & { path?: string }).path
      if (filePath) {
        onFile(filePath)
      }
    }
    input.click()
  }

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={handleClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          handleClick()
        }
      }}
      className={clsx(
        'group relative flex flex-col items-center justify-center gap-4 overflow-hidden rounded-[16px] border border-dashed p-6 text-center',
        'transition-all duration-200 ease-out cursor-pointer select-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/20',
        isDragging
          ? 'border-white/18 bg-white/[0.06] shadow-[0_20px_48px_rgba(0,0,0,0.24)]'
          : 'border-white/12 bg-[linear-gradient(180deg,rgba(24,24,28,0.92),rgba(12,12,14,0.98))] hover:border-white/18 hover:bg-[linear-gradient(180deg,rgba(29,29,34,0.94),rgba(14,14,18,0.98))]'
      )}
    >
      <div className="pointer-events-none absolute inset-x-10 top-0 h-px bg-gradient-to-r from-transparent via-white/14 to-transparent opacity-70" />
      <div
        className={clsx(
          'flex h-14 w-14 items-center justify-center rounded-[14px] border border-white/10 transition-all duration-200',
          isDragging ? 'bg-white/[0.08] text-text-primary animate-glow-pulse' : 'bg-white/[0.05] text-text-secondary group-hover:text-text-primary'
        )}
      >
        <Icon size={24} strokeWidth={1.8} />
      </div>
      <div className="space-y-2">
        <p className="font-display text-lg tracking-[-0.03em] text-text-primary transition-colors duration-200">
          {isDragging ? 'Release to upload' : label}
        </p>
        <p className="text-sm leading-6 text-text-secondary">
          Native file import with path preservation.
        </p>
        {accept && <p className="text-xs uppercase tracking-[0.16em] text-text-tertiary">Accepted: {accept}</p>}
      </div>
    </div>
  )
}
