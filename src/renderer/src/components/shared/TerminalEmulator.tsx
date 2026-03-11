import { useEffect, useRef, useState, useCallback } from 'react'
import clsx from 'clsx'
import { Copy, Check, ChevronRight } from 'lucide-react'

interface TerminalEmulatorProps {
  output: string[]
  title?: string
  className?: string
}

export function TerminalEmulator({
  output,
  title = 'AI Generation',
  className
}: TerminalEmulatorProps): React.JSX.Element {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [copied, setCopied] = useState(false)
  const [userScrolled, setUserScrolled] = useState(false)
  const prevOutputLength = useRef(0)

  const handleScroll = useCallback(() => {
    const el = scrollRef.current
    if (!el) return
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight
    setUserScrolled(distanceFromBottom > 40)
  }, [])

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    if (output.length > prevOutputLength.current && !userScrolled) {
      el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' })
    }
    prevOutputLength.current = output.length
  }, [output, userScrolled])

  const handleCopy = async (): Promise<void> => {
    const text = output.join('\n')
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const isStreaming = output.length > 0

  return (
    <div className={clsx('overflow-hidden rounded-[14px] border border-white/10 bg-[#0b0b0d] shadow-[0_24px_54px_rgba(0,0,0,0.28)]', className)}>
      <div className="relative flex items-center justify-between border-b border-white/8 bg-[#141417] px-4 py-3 select-none">
        <div className="flex items-center gap-2.5">
          <span className="h-3 w-3 rounded-full bg-[#ff6a88]" />
          <span className="h-3 w-3 rounded-full bg-[#ffc56b]" />
          <span className="h-3 w-3 rounded-full bg-[#52d7b5]" />
        </div>
        <div className="absolute left-1/2 flex -translate-x-1/2 items-center gap-2">
          <ChevronRight size={12} className="text-[#575a63]" strokeWidth={2.2} />
          <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-[#abafb8]">{title}</span>
        </div>
        <button
          onClick={handleCopy}
          className={clsx(
            'inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11px] font-medium transition-all duration-200',
            copied
              ? 'border-success/25 bg-success-muted text-success'
              : 'border-white/8 bg-white/[0.03] text-[#9a9da6] hover:border-white/14 hover:text-white'
          )}
          aria-label="Copy output"
        >
          {copied ? <Check size={11} /> : <Copy size={11} />}
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      <div ref={scrollRef} onScroll={handleScroll} className="terminal-body relative max-h-80 overflow-y-auto bg-[#0b0b0d] font-mono text-[12.5px] leading-[1.75] text-[#d7d8de] scroll-smooth">
        <div className="terminal-scanlines pointer-events-none absolute inset-0 z-10" />
        <div className="relative z-20 p-4">
          {output.length === 0 ? (
            <div className="flex items-center gap-2 text-[#5f626b]">
              <span className="select-none text-[#ff8fb4]">$</span>
              <span>Waiting for output</span>
              <span className="terminal-blink inline-block h-[14px] w-[7px] translate-y-[1px] bg-[#ff8fb4]" />
            </div>
          ) : (
            <>
              {output.map((line, index) => (
                <div key={index} className={clsx('flex whitespace-pre-wrap break-all', index === output.length - 1 && 'terminal-line-latest')} style={{ animationDelay: `${Math.min(index * 12, 300)}ms` }}>
                  <span className="mr-3 w-8 shrink-0 select-none text-right text-[11px] tabular-nums text-[#454851]">{index + 1}</span>
                  <span className={clsx('flex-1', colorizeLine(line))}>{line || '\u00A0'}</span>
                </div>
              ))}
              {isStreaming && (
                <div className="mt-1 flex items-center">
                  <span className="mr-3 w-8" />
                  <span className="terminal-blink inline-block h-[14px] w-[7px] translate-y-[1px] bg-[#ff8fb4]" />
                </div>
              )}
            </>
          )}
        </div>
        {userScrolled && <div className="pointer-events-none sticky bottom-0 left-0 right-0 h-10 bg-gradient-to-t from-[#0b0b0d] to-transparent" />}
      </div>
      <div className="flex items-center justify-between border-t border-white/8 bg-[#101013] px-4 py-2 text-[10px] font-mono text-[#636772] select-none">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5">
            {isStreaming && (
              <span className="relative flex h-[6px] w-[6px]">
                <span className="terminal-ping absolute inline-flex h-full w-full rounded-full bg-[#39d0b0] opacity-75" />
                <span className="relative inline-flex h-[6px] w-[6px] rounded-full bg-[#39d0b0]" />
              </span>
            )}
            {isStreaming ? 'streaming' : 'idle'}
          </span>
        </div>
        <span className="tabular-nums">{output.length} {output.length === 1 ? 'line' : 'lines'}</span>
      </div>
    </div>
  )
}

function colorizeLine(line: string): string {
  if (/error|fail|exception/i.test(line)) {
    return 'text-[#ff9a9a]'
  }
  if (/warn|warning|caution/i.test(line)) {
    return 'text-[#f6c56b]'
  }
  if (/success|complete|done|finish|created|written/i.test(line)) {
    return 'text-[#52d7b5]'
  }
  if (/^\s*[>$]/.test(line)) {
    return 'text-[#ff8fb4]'
  }
  if (/^\s*[#]|^\s*\/\//.test(line)) {
    return 'text-[#5d6068]'
  }
  if (/[-=]>|\.{3}|>>>/.test(line)) {
    return 'text-[#8b8f98]'
  }
  return 'text-[#d7d8de]'
}
