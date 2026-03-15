import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import clsx from 'clsx'
import { Sparkles, AlertCircle } from 'lucide-react'
import { Button } from '../ui/Button'

const MAX_PROMPT_LENGTH = 2000

interface WriteWithAIModalProps {
  open: boolean
  onClose: () => void
  onGenerate: (prompt: string) => Promise<boolean> | boolean
  blogSlug: string
}

export function WriteWithAIModal({
  open,
  onClose,
  onGenerate,
  blogSlug
}: WriteWithAIModalProps): React.JSX.Element | null {
  const [prompt, setPrompt] = useState('')
  const [validationError, setValidationError] = useState('')
  const [launching, setLaunching] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const cancelRef = useRef<HTMLButtonElement>(null)

  const handleGenerate = useCallback(async (): Promise<void> => {
    const trimmed = prompt.trim()
    if (!trimmed) {
      setValidationError('Please describe what you want the AI to write.')
      textareaRef.current?.focus()
      return
    }
    if (trimmed.length > MAX_PROMPT_LENGTH) {
      setValidationError(`Prompt is too long. Maximum ${MAX_PROMPT_LENGTH} characters.`)
      textareaRef.current?.focus()
      return
    }
    setValidationError('')
    const accepted = await onGenerate(trimmed)
    if (!accepted) return

    setLaunching(true)
    setTimeout(() => {
      setLaunching(false)
      onClose()
    }, 520)
  }, [prompt, onGenerate, onClose])

  useEffect(() => {
    if (!open) return undefined
    const timer = setTimeout(() => textareaRef.current?.focus(), 80)
    return () => clearTimeout(timer)
  }, [open])

  useEffect(() => {
    if (!open) return undefined
    const timer = setTimeout(() => {
      setPrompt('')
      setValidationError('')
    }, 0)
    return () => clearTimeout(timer)
  }, [open])

  useEffect(() => {
    if (!open) return undefined
    const handleKeyDown = (e: KeyboardEvent): void => {
      if (e.key === 'Escape' && !launching) {
        onClose()
      }
      if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        void handleGenerate()
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [open, launching, onClose, handleGenerate])

  useEffect(() => {
    if (!open) return undefined
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = ''
    }
  }, [open])

  const charCount = prompt.length
  const isOverLimit = charCount > MAX_PROMPT_LENGTH

  if (!open) return null

  if (launching) {
    return createPortal(
      <div className="fixed inset-0 z-[9999] pointer-events-none" aria-hidden="true">
        <div className="absolute left-1/2 top-1/2 h-[30rem] w-[42rem] max-h-[86vh] max-w-[92vw] -translate-x-1/2 -translate-y-1/2 rounded-[18px] border border-accent/28 bg-[linear-gradient(180deg,rgba(26,26,30,0.98),rgba(12,12,14,0.98))] shadow-[0_35px_90px_rgba(3,7,18,0.55)] animate-ai-launch-to-orb">
          <div className="flex h-full w-full items-center justify-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full border border-accent/28 bg-accent-muted text-accent">
              <Sparkles size={22} strokeWidth={1.9} />
            </div>
          </div>
        </div>
      </div>,
      document.body
    )
  }

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="write-ai-dialog-title">
      <div className="fixed inset-0 bg-black/70 backdrop-blur-md animate-fade-in" onClick={onClose} />
      <div className="relative flex max-h-[88vh] w-full max-w-2xl flex-col overflow-hidden rounded-[16px] border border-white/10 bg-[linear-gradient(180deg,rgba(26,26,30,0.98),rgba(12,12,14,0.98))] shadow-[0_35px_90px_rgba(3,7,18,0.55)] animate-scale-in">
        <div className="pointer-events-none absolute inset-x-12 top-0 h-px bg-gradient-to-r from-transparent via-white/14 to-transparent" />
        <div className="flex items-center gap-4 border-b border-white/8 px-6 py-5">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-accent/20 bg-accent-muted text-accent shadow-[0_16px_40px_rgba(255,92,143,0.18)]">
            <Sparkles size={20} strokeWidth={1.9} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs uppercase tracking-[0.18em] text-text-tertiary">AI Draft Studio</p>
            <h2 id="write-ai-dialog-title" className="mt-1 font-display text-2xl text-text-primary">Write with AI</h2>
            <p className="mt-1 truncate text-sm text-text-secondary">Targeting <span className="muted-code">{blogSlug}</span></p>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-6">
          <div className="space-y-5">
            <div className="rounded-[18px] border border-white/8 bg-white/[0.03] p-5">
              <div className="mb-3 flex items-center justify-between gap-3">
                <label htmlFor="ai-prompt-textarea" className="text-xs font-medium uppercase tracking-[0.18em] text-text-tertiary">Instructions</label>
                <span className={clsx('text-xs font-medium tabular-nums', isOverLimit ? 'text-danger' : 'text-text-tertiary')}>
                  {charCount.toLocaleString()}/{MAX_PROMPT_LENGTH.toLocaleString()}
                </span>
              </div>
              <textarea
                ref={textareaRef}
                id="ai-prompt-textarea"
                value={prompt}
                onChange={(e) => {
                  setPrompt(e.target.value)
                  if (validationError) setValidationError('')
                }}
                placeholder="Describe tone, structure, key messages, examples to include, and any constraints the draft should follow."
                rows={8}
                className={clsx(
                  'min-h-[220px] w-full resize-y rounded-[12px] border px-4 py-4 text-sm leading-7',
                  'bg-[linear-gradient(180deg,rgba(22,22,26,0.94),rgba(14,14,18,0.9))] text-text-primary placeholder:text-text-tertiary transition-all duration-200',
                  validationError
                    ? 'border-danger/45 focus:border-danger focus:shadow-[0_0_0_3px_rgba(255,140,140,0.12)]'
                    : 'border-white/10 hover:border-white/16 focus:border-white/18 focus:shadow-[0_0_0_3px_rgba(255,255,255,0.05)]',
                  'focus:outline-none'
                )}
              />
              {validationError && (
                <p className="mt-3 flex items-center gap-1.5 text-xs text-danger">
                  <AlertCircle size={12} />
                  {validationError}
                </p>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center justify-between gap-4 border-t border-white/8 px-6 py-4">
          <span className="text-xs text-text-tertiary">
            <kbd className="muted-code">{navigator.userAgent.includes('Mac') ? '\u2318' : 'Ctrl'}+Enter</kbd>
          </span>
          <div className="ml-auto flex items-center gap-3">
            <Button ref={cancelRef} variant="secondary" size="md" onClick={onClose}>
              Cancel
            </Button>
            <Button
              variant="primary"
              size="md"
              icon={Sparkles}
              disabled={isOverLimit}
              onClick={() => void handleGenerate()}
            >
              Generate
            </Button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  )
}
