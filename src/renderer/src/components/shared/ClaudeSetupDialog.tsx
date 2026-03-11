import { useEffect, useRef, useState, useCallback } from 'react'
import { createPortal } from 'react-dom'
import clsx from 'clsx'
import {
  Terminal,
  Copy,
  Check,
  AlertCircle,
  ExternalLink,
  ChevronRight
} from 'lucide-react'
import { Button } from '../ui/Button'

interface ClaudeSetupDialogProps {
  open: boolean
  onClose: () => void
  onComplete: () => void
  reason: 'not-installed' | 'not-logged-in'
}

type Platform = 'mac-linux' | 'win-powershell' | 'win-cmd'

interface InstallCommand {
  label: string
  platform: Platform
  command: string
  lang: string
}

const INSTALL_COMMANDS: InstallCommand[] = [
  {
    label: 'macOS / Linux / WSL',
    platform: 'mac-linux',
    command: 'curl -fsSL https://claude.ai/install.sh | bash',
    lang: 'bash'
  },
  {
    label: 'Windows PowerShell',
    platform: 'win-powershell',
    command: 'irm https://claude.ai/install.ps1 | iex',
    lang: 'powershell'
  },
  {
    label: 'Windows CMD',
    platform: 'win-cmd',
    command: 'curl -fsSL https://claude.ai/install.cmd -o install.cmd && install.cmd && del install.cmd',
    lang: 'cmd'
  }
]

function detectPlatform(): Platform {
  const ua = navigator.userAgent.toLowerCase()
  const platform = navigator.platform?.toLowerCase() ?? ''

  if (platform.startsWith('mac') || platform.startsWith('darwin') || ua.includes('macintosh')) {
    return 'mac-linux'
  }
  if (platform.startsWith('linux') || ua.includes('linux')) {
    return 'mac-linux'
  }
  return 'win-powershell'
}

function CopyButton({ text }: { text: string }): React.JSX.Element {
  const [copied, setCopied] = useState(false)

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Fallback: create a textarea and copy from it
      const ta = document.createElement('textarea')
      ta.value = text
      ta.style.position = 'fixed'
      ta.style.opacity = '0'
      document.body.appendChild(ta)
      ta.select()
      document.execCommand('copy')
      document.body.removeChild(ta)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }, [text])

  return (
    <button
      type="button"
      onClick={handleCopy}
      className={clsx(
        'inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium',
        'transition-all duration-200 cursor-pointer',
        'focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2',
        copied
          ? 'bg-success/10 text-success border border-success/20'
          : 'bg-white/[0.06] text-[#b0aca4] border border-white/[0.08] hover:bg-white/[0.1] hover:text-[#d0ccc4]'
      )}
      title={copied ? 'Copied!' : 'Copy to clipboard'}
    >
      {copied ? (
        <>
          <Check size={12} strokeWidth={2.5} />
          <span>Copied</span>
        </>
      ) : (
        <>
          <Copy size={12} />
          <span>Copy</span>
        </>
      )}
    </button>
  )
}

function CodeBlock({ command, lang }: { command: string; lang: string }): React.JSX.Element {
  return (
    <div className="relative group rounded-lg overflow-hidden border border-[#2a2723] bg-[#1a1916]">
      {/* Language badge + copy */}
      <div className="flex items-center justify-between px-3.5 py-2 border-b border-[#2a2723] bg-[#1f1d19]">
        <span className="text-[10px] font-mono uppercase tracking-wider text-[#6b665c]">
          {lang}
        </span>
        <CopyButton text={command} />
      </div>
      {/* Command */}
      <div className="px-3.5 py-3 overflow-x-auto">
        <code className="text-[13px] leading-relaxed font-mono text-[#e8e4dc] whitespace-pre select-all">
          {command}
        </code>
      </div>
    </div>
  )
}

export function ClaudeSetupDialog({
  open,
  onClose,
  onComplete,
  reason
}: ClaudeSetupDialogProps): React.JSX.Element | null {
  const cancelRef = useRef<HTMLButtonElement>(null)
  const [selectedPlatform, setSelectedPlatform] = useState<Platform>(detectPlatform)
  const [loginClicked, setLoginClicked] = useState(false)
  const [terminalLoading, setTerminalLoading] = useState(false)
  const [terminalError, setTerminalError] = useState<string | null>(null)

  const selectedCommand = INSTALL_COMMANDS.find((c) => c.platform === selectedPlatform)!

  // Focus cancel button when dialog opens
  useEffect(() => {
    if (!open) return undefined
    const timer = setTimeout(() => cancelRef.current?.focus(), 50)
    return () => clearTimeout(timer)
  }, [open])

  // Reset state when dialog opens
  useEffect(() => {
    if (open) {
      setLoginClicked(false)
      setTerminalLoading(false)
      setTerminalError(null)
      setSelectedPlatform(detectPlatform())
    }
  }, [open])

  // Close on Escape
  useEffect(() => {
    if (!open) return undefined
    const handleKeyDown = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [open, onClose])

  // Prevent body scroll when open
  useEffect(() => {
    if (!open) return undefined
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = ''
    }
  }, [open])

  const handleOpenTerminal = useCallback(async () => {
    setTerminalLoading(true)
    setTerminalError(null)
    try {
      const result = await window.api.openTerminalLogin()
      if (result.success) {
        setLoginClicked(true)
      } else {
        setTerminalError(result.error ?? 'Failed to open terminal. Please try again.')
      }
    } catch (err) {
      setTerminalError(
        err instanceof Error ? err.message : 'An unexpected error occurred while opening the terminal.'
      )
    } finally {
      setTerminalLoading(false)
    }
  }, [])

  if (!open) return null

  const isInstallFlow = reason === 'not-installed'

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="claude-setup-dialog-title"
      aria-describedby="claude-setup-dialog-desc"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-text-primary/20 backdrop-blur-[2px] animate-fade-in"
        onClick={onClose}
      />

      {/* Dialog panel */}
      <div
        className={clsx(
          'relative w-full',
          isInstallFlow ? 'max-w-lg' : 'max-w-md',
          'bg-bg-elevated rounded-lg shadow-lg',
          'border border-border-primary',
          'animate-scale-in',
          'flex flex-col max-h-[85vh]'
        )}
      >
        {/* ─── Header ─── */}
        <div className="flex items-center gap-3 px-6 pt-6 pb-0">
          <div className="shrink-0 p-2.5 rounded-lg bg-[#1a1916]">
            <Terminal size={18} className="text-[#5de4c7]" strokeWidth={2} />
          </div>
          <div className="flex-1 min-w-0">
            <h2
              id="claude-setup-dialog-title"
              className="text-base font-semibold text-text-primary"
            >
              Claude Code Setup Required
            </h2>
            <p className="text-xs text-text-tertiary mt-0.5">
              {isInstallFlow
                ? 'Install the CLI to unlock AI generation'
                : 'Log in to start using AI features'}
            </p>
          </div>
        </div>

        {/* ─── Body (scrollable) ─── */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {/* Description */}
          <p id="claude-setup-dialog-desc" className="text-sm text-text-secondary leading-relaxed">
            {isInstallFlow
              ? 'Claude Code CLI is not installed on your system. Install it using one of the commands below, then log in to activate AI generation features.'
              : 'You need to log in to Claude Code to use AI generation. Click the button below to open a terminal where you can authenticate.'}
          </p>

          {/* ─── Install flow: platform tabs + code blocks ─── */}
          {isInstallFlow && (
            <div className="space-y-3 animate-fade-in">
              {/* Platform tabs */}
              <div className="flex gap-1 p-1 rounded-lg bg-bg-secondary border border-border-primary">
                {INSTALL_COMMANDS.map((cmd) => (
                  <button
                    key={cmd.platform}
                    type="button"
                    onClick={() => setSelectedPlatform(cmd.platform)}
                    className={clsx(
                      'flex-1 px-3 py-1.5 rounded-md text-xs font-medium',
                      'transition-all duration-200 cursor-pointer',
                      'focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-1',
                      selectedPlatform === cmd.platform
                        ? 'bg-bg-elevated text-text-primary shadow-sm border border-border-primary'
                        : 'text-text-tertiary hover:text-text-secondary border border-transparent'
                    )}
                  >
                    {cmd.label}
                  </button>
                ))}
              </div>

              {/* Code block for selected platform */}
              <CodeBlock command={selectedCommand.command} lang={selectedCommand.lang} />

              {/* Post-install note */}
              <div className="flex items-start gap-2.5 px-3.5 py-3 rounded-md bg-bg-secondary border border-border-primary">
                <ChevronRight
                  size={14}
                  className="text-accent shrink-0 mt-0.5"
                  strokeWidth={2.5}
                />
                <p className="text-xs text-text-secondary leading-relaxed">
                  After installation completes, click{' '}
                  <span className="font-semibold text-text-primary">Login to Claude</span>{' '}
                  below to authenticate.
                </p>
              </div>
            </div>
          )}

          {/* ─── Login flow: instructions ─── */}
          {!isInstallFlow && (
            <div className="space-y-3 animate-fade-in">
              <div className="flex items-start gap-2.5 px-3.5 py-3 rounded-md bg-bg-secondary border border-border-primary">
                <ChevronRight
                  size={14}
                  className="text-accent shrink-0 mt-0.5"
                  strokeWidth={2.5}
                />
                <p className="text-xs text-text-secondary leading-relaxed">
                  A terminal window will open for you to log in. After authentication is
                  complete, close the terminal and click{' '}
                  <span className="font-semibold text-text-primary">Done</span> to continue.
                </p>
              </div>
            </div>
          )}

          {/* ─── Terminal error banner ─── */}
          {terminalError && (
            <div className="flex items-start gap-3 bg-danger-muted border border-danger/20 rounded-md p-3.5 animate-fade-in">
              <AlertCircle size={16} className="text-danger shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-text-primary">
                  Could not open terminal
                </p>
                <p className="text-xs text-text-secondary mt-0.5">
                  {terminalError}
                </p>
              </div>
            </div>
          )}

          {/* ─── Success state: login was triggered ─── */}
          {loginClicked && (
            <div className="flex items-start gap-3 bg-success-muted border border-success/20 rounded-md p-3.5 animate-fade-in">
              <ExternalLink size={16} className="text-success shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-text-primary">
                  Terminal opened
                </p>
                <p className="text-xs text-text-secondary mt-0.5">
                  Complete the login in the terminal window, then click{' '}
                  <span className="font-semibold">Done</span> below.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* ─── Footer ─── */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-border-primary">
          <Button
            ref={cancelRef}
            variant="secondary"
            size="md"
            onClick={onClose}
          >
            Cancel
          </Button>

          {/* Login button */}
          {!loginClicked && (
            <Button
              variant={isInstallFlow ? 'secondary' : 'primary'}
              size="md"
              icon={terminalLoading ? undefined : Terminal}
              loading={terminalLoading}
              disabled={terminalLoading}
              onClick={handleOpenTerminal}
            >
              Login to Claude
            </Button>
          )}

          {/* Done button - shown after login was triggered */}
          {loginClicked && (
            <Button
              variant="primary"
              size="md"
              onClick={onComplete}
            >
              Done
            </Button>
          )}
        </div>
      </div>
    </div>,
    document.body
  )
}
