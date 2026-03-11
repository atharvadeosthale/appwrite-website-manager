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

  // Auto-focus textarea when modal opens
  useEffect(() => {
    if (!open) return undefined
    const timer = setTimeout(() => textareaRef.current?.focus(), 80)
    return () => clearTimeout(timer)
  }, [open])

  // Reset state when modal opens
  useEffect(() => {
    if (open) {
      setPrompt('')
      setValidationError('')
    }
  }, [open])

  // Keyboard shortcuts: Escape to close, Cmd/Ctrl+Enter to submit
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

  // Prevent body scroll when open
  useEffect(() => {
    if (!open) return undefined
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = ''
    }
  }, [open])

  const handleGenerate = (): void => {
    console.log('[WriteWithAIModal] Generate button clicked')
    const trimmed = prompt.trim()
    if (!trimmed) {
      console.log('[WriteWithAIModal] Validation failed: empty prompt')
      setValidationError('Please describe what you want the AI to write.')
      textareaRef.current?.focus()
      return
    }
    if (trimmed.length > MAX_PROMPT_LENGTH) {
      console.log('[WriteWithAIModal] Validation failed: prompt too long', trimmed.length)
      setValidationError(`Prompt is too long. Maximum ${MAX_PROMPT_LENGTH} characters.`)
      textareaRef.current?.focus()
      return
    }
    setValidationError('')
    console.log('[WriteWithAIModal] Calling onGenerate with prompt length:', trimmed.length)
    onGenerate(trimmed)
  }

  const charCount = prompt.length
  const isOverLimit = charCount > MAX_PROMPT_LENGTH
  const isPromptEmpty = prompt.trim().length === 0

  if (!open) return null

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="write-ai-dialog-title"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-text-primary/20 backdrop-blur-[2px] animate-fade-in"
        onClick={generating ? undefined : onClose}
      />

      {/* Dialog panel */}
      <div
        className={clsx(
          'relative w-full max-w-xl',
          'bg-bg-elevated rounded-lg shadow-lg',
          'border border-border-primary',
          'animate-scale-in',
          'flex flex-col max-h-[85vh]'
        )}
      >
        {/* ─── Header ─── */}
        <div className="flex items-center gap-3 px-6 pt-6 pb-0">
          <div className="shrink-0 p-2 rounded-full bg-accent-muted">
            <Sparkles size={18} className="text-accent" />
          </div>
          <div className="flex-1 min-w-0">
            <h2
              id="write-ai-dialog-title"
              className="text-base font-semibold text-text-primary"
            >
              Write with AI
            </h2>
            <p className="text-xs text-text-tertiary mt-0.5 truncate">
              Generating content for{' '}
              <span className="font-mono">{blogSlug}</span>
            </p>
          </div>
        </div>

        {/* ─── Body (scrollable) ─── */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          {/* Prompt textarea */}
          <div>
            <label
              htmlFor="ai-prompt-textarea"
              className="block text-sm font-medium text-text-primary mb-1.5"
            >
              Instructions
            </label>
            <textarea
              ref={textareaRef}
              id="ai-prompt-textarea"
              value={prompt}
              onChange={(e) => {
                setPrompt(e.target.value)
                if (validationError) setValidationError('')
              }}
              placeholder="Describe what you want the AI to write. For example: &quot;Write an introduction about Appwrite's new storage API, focusing on the developer experience improvements and including code examples in JavaScript.&quot;"
              rows={5}
              disabled={generating}
              className={clsx(
                'w-full bg-bg-elevated text-text-primary rounded-md font-sans',
                'border px-3 py-2.5 text-sm leading-relaxed',
                'transition-all duration-200',
                'placeholder:text-text-tertiary',
                'resize-y min-h-[120px] max-h-[280px]',
                validationError
                  ? 'border-danger focus:border-danger focus:shadow-[0_0_0_3px_rgba(217,48,54,0.1)]'
                  : 'border-border-primary hover:border-border-secondary focus:border-accent focus:shadow-[0_0_0_3px_var(--color-accent-muted)]',
                'focus:outline-none',
                generating && 'opacity-60 cursor-not-allowed'
              )}
            />

            {/* Character counter + validation row */}
            <div className="flex items-center justify-between mt-1.5 min-h-[20px]">
              <div className="flex-1">
                {validationError && (
                  <p className="text-xs text-danger flex items-center gap-1 animate-fade-in">
                    <AlertCircle size={12} className="shrink-0" />
                    {validationError}
                  </p>
                )}
              </div>
              <span
                className={clsx(
                  'text-xs tabular-nums shrink-0 ml-3',
                  isOverLimit ? 'text-danger font-medium' : 'text-text-tertiary'
                )}
              >
                {charCount.toLocaleString()}/{MAX_PROMPT_LENGTH.toLocaleString()}
              </span>
            </div>
          </div>

          {/* Success banner */}
          {result === 'success' && (
            <div className="flex items-start gap-3 bg-success-muted border border-success/20 rounded-md p-3.5 animate-fade-in">
              <CheckCircle2 size={16} className="text-success shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-text-primary">
                  Content generated successfully
                </p>
                <p className="text-xs text-text-secondary mt-0.5">
                  The AI-written content has been applied to your blog post.
                </p>
              </div>
            </div>
          )}

          {/* Error banner */}
          {result === 'error' && (
            <div className="flex items-start gap-3 bg-danger-muted border border-danger/20 rounded-md p-3.5 animate-fade-in">
              <AlertCircle size={16} className="text-danger shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-text-primary">
                  Generation failed
                </p>
                <p className="text-xs text-text-secondary mt-0.5">
                  Something went wrong. Please try again with different instructions.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* ─── Footer ─── */}
        <div className="flex items-center justify-between gap-3 px-6 py-4 border-t border-border-primary">
          <span className="text-xs text-text-tertiary hidden sm:block">
            {generating ? (
              <span className="inline-flex items-center gap-1.5">
                <Loader2 size={12} className="animate-spin" />
                Generating...
              </span>
            ) : (
              <kbd className="font-mono">
                {navigator.userAgent.includes('Mac') ? '\u2318' : 'Ctrl'}+Enter
              </kbd>
            )}
          </span>
          <div className="flex items-center gap-3 ml-auto">
            <Button
              ref={cancelRef}
              variant="secondary"
              size="md"
              onClick={onClose}
              disabled={generating}
            >
              {result ? 'Close' : 'Cancel'}
            </Button>
            {!result && (
              <Button
                variant="primary"
                size="md"
                icon={generating ? undefined : Sparkles}
                loading={generating}
                disabled={generating || isOverLimit}
                onClick={handleGenerate}
              >
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
