import { useEffect, useRef, useState } from 'react'
import clsx from 'clsx'
import { Copy, Check, Terminal } from 'lucide-react'

interface TerminalOutputProps {
  lines: string[]
  title?: string
}

export function TerminalOutput({ lines, title }: TerminalOutputProps): React.JSX.Element {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [copied, setCopied] = useState(false)

  // Auto-scroll to bottom when new lines arrive
  useEffect(() => {
    const el = scrollRef.current
    if (el) {
      el.scrollTop = el.scrollHeight
    }
  }, [lines])

  const handleCopy = async (): Promise<void> => {
    const text = lines.join('\n')
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="rounded-lg border border-border-primary overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-bg-tertiary border-b border-border-primary">
        <div className="flex items-center gap-2 text-text-secondary">
          <Terminal size={14} />
          <span className="text-xs font-medium">{title ?? 'Output'}</span>
        </div>
        <button
          onClick={handleCopy}
          className={clsx(
            'inline-flex items-center gap-1.5 px-2 py-1 rounded-sm',
            'text-xs cursor-pointer',
            'transition-all duration-200',
            copied
              ? 'text-success bg-success-muted'
              : 'text-text-tertiary hover:text-text-secondary hover:bg-bg-hover'
          )}
          aria-label="Copy output"
        >
          {copied ? <Check size={12} /> : <Copy size={12} />}
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>

      {/* Terminal body */}
      <div
        ref={scrollRef}
        className={clsx(
          'bg-bg-tertiary/60 p-4',
          'max-h-72 overflow-y-auto',
          'font-mono text-xs leading-relaxed text-text-primary'
        )}
      >
        {lines.length === 0 ? (
          <span className="text-text-tertiary italic">Waiting for output...</span>
        ) : (
          lines.map((line, i) => (
            <div key={i} className="whitespace-pre-wrap break-all">
              <span className="text-text-tertiary select-none mr-3 inline-block w-5 text-right tabular-nums">
                {i + 1}
              </span>
              {line}
            </div>
          ))
        )}
      </div>
    </div>
  )
}
