import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import clsx from 'clsx'
import { Sparkles, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react'
import { Button } from '../ui/Button'

const MAX_PROMPT_LENGTH = 2000

interface WriteWithAIModalProps {
  open: boolean
  onClose: () => void
  onGenerate: (prompt: string) => void
  blogSlug: string
  generating: boolean
  result: 'success' | 'error' | null
}

export function WriteWithAIModal({
  open,
  onClose,
  onGenerate,
  blogSlug,
  generating,
  result
}: WriteWithAIModalProps): React.JSX.Element | null {
  const [prompt, setPrompt] = useState('')
  const [validationError, setValidationError] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const cancelRef = useRef<HTMLButtonElement>(null)

  const handleGenerate = (): void => {
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
    onGenerate(trimmed)
  }

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
      if (e.key === 'Escape' && !generating) {
        onClose()
      }
      if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        handleGenerate()
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [open, generating, prompt])

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

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="write-ai-dialog-title">
      <div className="fixed inset-0 bg-black/70 backdrop-blur-md animate-fade-in" onClick={generating ? undefined : onClose} />
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
                disabled={generating}
                className={clsx(
                  'min-h-[220px] w-full resize-y rounded-[12px] border px-4 py-4 text-sm leading-7',
                  'bg-[linear-gradient(180deg,rgba(22,22,26,0.94),rgba(14,14,18,0.9))] text-text-primary placeholder:text-text-tertiary transition-all duration-200',
                  validationError
                    ? 'border-danger/45 focus:border-danger focus:shadow-[0_0_0_3px_rgba(255,140,140,0.12)]'
                    : 'border-white/10 hover:border-white/16 focus:border-white/18 focus:shadow-[0_0_0_3px_rgba(255,255,255,0.05)]',
                  'focus:outline-none',
                  generating && 'cursor-not-allowed opacity-60'
                )}
              />
              {validationError && (
                <p className="mt-3 flex items-center gap-1.5 text-xs text-danger">
                  <AlertCircle size={12} />
                  {validationError}
                </p>
              )}
            </div>

            {result === 'success' && (
              <div className="flex items-start gap-3 rounded-[16px] border border-success/16 bg-success-muted p-4 animate-fade-in">
                <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-success" />
                <div>
                  <p className="text-sm font-medium text-text-primary">Draft generated successfully</p>
                  <p className="mt-1 text-sm text-text-secondary">The editor has been refreshed with the AI-generated content.</p>
                </div>
              </div>
            )}

            {result === 'error' && (
              <div className="flex items-start gap-3 rounded-[16px] border border-danger/16 bg-danger-muted p-4 animate-fade-in">
                <AlertCircle size={18} className="mt-0.5 shrink-0 text-danger" />
                <div>
                  <p className="text-sm font-medium text-text-primary">Generation failed</p>
                  <p className="mt-1 text-sm text-text-secondary">Try a tighter prompt or adjust the constraints and run it again.</p>
                </div>
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center justify-between gap-4 border-t border-white/8 px-6 py-4">
          <span className="text-xs text-text-tertiary">
            {generating ? (
              <span className="inline-flex items-center gap-1.5">
                <Loader2 size={12} className="animate-spin" />
                Generating draft...
              </span>
            ) : (
              <kbd className="muted-code">{navigator.userAgent.includes('Mac') ? '\u2318' : 'Ctrl'}+Enter</kbd>
            )}
          </span>
          <div className="ml-auto flex items-center gap-3">
            <Button ref={cancelRef} variant="secondary" size="md" onClick={onClose} disabled={generating}>
              {result ? 'Close' : 'Cancel'}
            </Button>
            {!result && (
              <Button variant="primary" size="md" icon={generating ? undefined : Sparkles} loading={generating} disabled={generating || isOverLimit} onClick={handleGenerate}>
                Generate
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body
  )
}
