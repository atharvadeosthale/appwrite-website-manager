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
    <div className="overflow-hidden rounded-[16px] border border-white/10 bg-[linear-gradient(180deg,rgba(16,16,19,0.98),rgba(10,10,12,0.98))] shadow-[0_22px_48px_rgba(0,0,0,0.28)]">
      <div className="flex items-center justify-between border-b border-white/8 bg-white/[0.03] px-4 py-3">
        <div className="flex items-center gap-2 text-text-secondary">
          <span className="flex h-9 w-9 items-center justify-center rounded-[12px] border border-white/8 bg-white/[0.04]">
            <Terminal size={15} className="text-text-primary" />
          </span>
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-text-tertiary">Live Output</p>
            <p className="text-sm text-text-primary">{title ?? 'Output'}</p>
          </div>
        </div>
        <button
          onClick={handleCopy}
          className={clsx(
            'inline-flex items-center gap-1.5 rounded-[12px] border px-3 py-1.5 text-xs font-medium transition-all duration-200',
            copied
              ? 'border-success/20 bg-success-muted text-success'
              : 'border-white/10 bg-white/[0.04] text-text-secondary hover:border-white/16 hover:text-text-primary'
          )}
          aria-label="Copy output"
        >
          {copied ? <Check size={12} /> : <Copy size={12} />}
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      <div ref={scrollRef} className="max-h-80 overflow-y-auto bg-[#0b0b0d] p-4 font-mono text-[12px] leading-6 text-[#d7d8de]">
        {lines.length === 0 ? (
          <span className="text-text-tertiary italic">Waiting for output...</span>
        ) : (
          lines.map((line, index) => (
            <div key={index} className="grid grid-cols-[2.25rem_1fr] gap-3 whitespace-pre-wrap break-all">
              <span className="select-none text-right text-[10px] text-[#50545c]">{index + 1}</span>
              <span>{line || '\u00A0'}</span>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
