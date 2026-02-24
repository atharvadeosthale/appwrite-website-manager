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

    // Check extension filter
    if (accept) {
      const extensions = accept.split(',').map((ext) => ext.trim().toLowerCase())
      const fileName = file.name.toLowerCase()
      const matches = extensions.some((ext) => fileName.endsWith(ext))
      if (!matches) return
    }

    // Electron exposes native path on File objects
    const filePath = (file as File & { path?: string }).path
    if (filePath) {
      onFile(filePath)
    }
  }

  const handleClick = (): void => {
    // Create a temporary file input to open native file picker
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
        'relative flex flex-col items-center justify-center gap-3',
        'p-8 rounded-lg',
        'border-2 border-dashed',
        'cursor-pointer select-none',
        'transition-all duration-200',
        'focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2',
        isDragging
          ? 'border-accent bg-accent-muted scale-[1.01]'
          : 'border-border-secondary bg-bg-secondary/50 hover:border-border-secondary hover:bg-bg-hover'
      )}
    >
      <div
        className={clsx(
          'p-3 rounded-full transition-colors duration-200',
          isDragging ? 'bg-accent/10 text-accent' : 'bg-bg-tertiary text-text-tertiary'
        )}
      >
        <Icon size={24} />
      </div>
      <div className="text-center">
        <p
          className={clsx(
            'text-sm font-medium transition-colors duration-200',
            isDragging ? 'text-accent' : 'text-text-secondary'
          )}
        >
          {isDragging ? 'Drop to upload' : label}
        </p>
        {accept && (
          <p className="mt-1 text-xs text-text-tertiary">
            Accepted: {accept}
          </p>
        )}
      </div>
    </div>
  )
}
