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

  // Track whether user has manually scrolled up
  const handleScroll = useCallback(() => {
    const el = scrollRef.current
    if (!el) return
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight
    // If user scrolled more than 40px from bottom, they're reading history
    setUserScrolled(distanceFromBottom > 40)
  }, [])

  // Auto-scroll to bottom when new lines arrive, unless user scrolled up
  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    if (output.length > prevOutputLength.current && !userScrolled) {
      el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' })
    }
    prevOutputLength.current = output.length
  }, [output, userScrolled])

  // Reset user scroll flag when output is cleared (new generation)
  useEffect(() => {
    if (output.length === 0) {
      setUserScrolled(false)
    }
  }, [output.length])

  const handleCopy = async (): Promise<void> => {
    const text = output.join('\n')
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const isStreaming = output.length > 0

  return (
    <div
      className={clsx(
        'terminal-emulator rounded-lg overflow-hidden',
        'shadow-lg border border-[#1a1a1a]',
        className
      )}
    >
      {/* ── Window Chrome ── */}
      <div className="terminal-chrome flex items-center justify-between px-4 py-2.5 bg-[#1e1e1e] border-b border-[#2a2a2a] select-none">
        {/* Traffic lights */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-[7px]">
            <span className="w-[11px] h-[11px] rounded-full bg-[#ff5f57] shadow-[inset_0_-1px_1px_rgba(0,0,0,0.2)] border border-[#e0443e]" />
            <span className="w-[11px] h-[11px] rounded-full bg-[#febc2e] shadow-[inset_0_-1px_1px_rgba(0,0,0,0.2)] border border-[#dea123]" />
            <span className="w-[11px] h-[11px] rounded-full bg-[#28c840] shadow-[inset_0_-1px_1px_rgba(0,0,0,0.2)] border border-[#1aab29]" />
          </div>
        </div>

        {/* Title */}
        <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-1.5">
          <ChevronRight size={11} className="text-[#636363]" strokeWidth={2.5} />
          <span className="text-[11px] font-medium tracking-wide text-[#8a8a8a] font-mono uppercase">
            {title}
          </span>
        </div>

        {/* Copy button */}
        <button
          onClick={handleCopy}
          className={clsx(
            'inline-flex items-center gap-1.5 px-2 py-1 rounded-[4px]',
            'text-[11px] font-mono cursor-pointer',
            'transition-all duration-200',
            copied
              ? 'text-[#28c840] bg-[#28c840]/10'
              : 'text-[#636363] hover:text-[#999] hover:bg-[#ffffff08]'
          )}
          aria-label="Copy output"
        >
          {copied ? <Check size={11} /> : <Copy size={11} />}
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>

      {/* ── Terminal Body ── */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className={clsx(
          'terminal-body relative',
          'bg-[#0d0d0d]',
          'max-h-80 overflow-y-auto',
          'font-mono text-[12.5px] leading-[1.7]',
          'scroll-smooth'
        )}
      >
        {/* Subtle scanline overlay */}
        <div className="terminal-scanlines pointer-events-none absolute inset-0 z-10" />

        {/* Content area */}
        <div className="relative z-20 p-4">
          {output.length === 0 ? (
            <div className="flex items-center gap-2 text-[#4a4a4a]">
              <span className="text-[#636363] select-none">$</span>
              <span>Waiting for output</span>
              <span className="terminal-blink inline-block w-[7px] h-[14px] bg-[#636363] translate-y-[1px]" />
            </div>
          ) : (
            <>
              {output.map((line, i) => (
                <div
                  key={i}
                  className={clsx(
                    'terminal-line flex whitespace-pre-wrap break-all',
                    i === output.length - 1 && 'terminal-line-latest'
                  )}
                  style={{
                    animationDelay: `${Math.min(i * 12, 300)}ms`
                  }}
                >
                  {/* Line number gutter */}
                  <span className="terminal-gutter shrink-0 select-none w-8 mr-3 text-right tabular-nums text-[#2e2e2e] text-[11px]">
                    {i + 1}
                  </span>
                  {/* Line content */}
                  <span className={clsx(
                    'flex-1',
                    colorizeLine(line)
                  )}>
                    {line || '\u00A0'}
                  </span>
                </div>
              ))}
              {/* Blinking cursor on last line */}
              {isStreaming && (
                <div className="flex items-center mt-0.5">
                  <span className="w-8 mr-3" />
                  <span className="terminal-blink inline-block w-[7px] h-[14px] bg-[#5de4c7] translate-y-[1px]" />
                </div>
              )}
            </>
          )}
        </div>

        {/* Bottom gradient fade when scrollable */}
        {userScrolled && (
          <div className="sticky bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-[#0d0d0d] to-transparent pointer-events-none z-30" />
        )}
      </div>

      {/* ── Status Bar ── */}
      <div className="flex items-center justify-between px-4 py-1.5 bg-[#161616] border-t border-[#1f1f1f] text-[10px] font-mono select-none">
        <div className="flex items-center gap-3 text-[#444]">
          <span className="flex items-center gap-1.5">
            {isStreaming && (
              <span className="relative flex h-[6px] w-[6px]">
                <span className="terminal-ping absolute inline-flex h-full w-full rounded-full bg-[#5de4c7] opacity-75" />
                <span className="relative inline-flex rounded-full h-[6px] w-[6px] bg-[#5de4c7]" />
              </span>
            )}
            {isStreaming ? 'streaming' : 'idle'}
          </span>
        </div>
        <span className="text-[#333] tabular-nums">
          {output.length} {output.length === 1 ? 'line' : 'lines'}
        </span>
      </div>
    </div>
  )
}

/**
 * Applies color classes based on line content patterns.
 * Gives different terminal output lines distinct visual character.
 */
function colorizeLine(line: string): string {
  // Error lines
  if (/error|fail|exception/i.test(line)) {
    return 'text-[#f47067]'
  }
  // Warning lines
  if (/warn|warning|caution/i.test(line)) {
    return 'text-[#e0a84c]'
  }
  // Success / completion lines
  if (/success|complete|done|finish|created|written/i.test(line)) {
    return 'text-[#5de4c7]'
  }
  // Lines starting with > or $ (command prompts)
  if (/^\s*[>$]/.test(line)) {
    return 'text-[#89b4fa]'
  }
  // Lines starting with # or // (comments)
  if (/^\s*[#]|^\s*\/\//.test(line)) {
    return 'text-[#4a4a4a]'
  }
  // Lines with arrows or status indicators
  if (/[=\-]>|\.{3}|>>>/.test(line)) {
    return 'text-[#7c7c7c]'
  }
  // Default output color — a soft off-white with slight warmth
  return 'text-[#b4b4b4]'
}
