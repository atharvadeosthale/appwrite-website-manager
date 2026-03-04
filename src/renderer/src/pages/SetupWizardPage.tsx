import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  CheckCircle2,
  GitBranch,
  Box,
  Zap,
  Github,
  Copy,
  Check,
  AlertTriangle,
  RefreshCw,
  ArrowRight,
  X
} from 'lucide-react'
import { Button } from '../components/ui/Button'
import { Badge } from '../components/ui/Badge'
import { Spinner } from '../components/ui/Spinner'
import { TerminalOutput } from '../components/shared/TerminalOutput'
import { useSetupStatus } from '../hooks/useSetupStatus'
import type { PrerequisiteStatus, InstallResult } from '../types'

/* ─── Tool metadata for the prerequisite cards ─── */

const TOOL_META: Record<
  PrerequisiteStatus['id'],
  { label: string; description: string; icon: typeof GitBranch }
> = {
  git: { label: 'Git', description: 'Version control system', icon: GitBranch },
  node: { label: 'Node.js', description: 'JavaScript runtime', icon: Box },
  bun: { label: 'Bun', description: 'Fast JavaScript bundler & runtime', icon: Zap },
  gh: { label: 'GitHub CLI', description: 'GitHub command-line tool', icon: Github }
}

const INSTALL_FNS: Record<PrerequisiteStatus['id'], () => Promise<InstallResult>> = {
  git: () => window.api.setupInstallGit(),
  node: () => window.api.setupInstallNode(),
  bun: () => window.api.setupInstallBun(),
  gh: () => window.api.setupInstallGh()
}

/* ─── GhAuthPanel — shown inside gh card during authentication ─── */

function GhAuthPanel({
  code,
  onCancel
}: {
  code: string | null
  onCancel: () => void
}): React.JSX.Element {
  const [copied, setCopied] = useState(false)

  const handleCopy = useCallback(async () => {
    if (!code) return
    await navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [code])

  return (
    <div className="mt-4 animate-fade-in">
      <div className="rounded-lg bg-bg-secondary border border-border-primary p-5">
        {code ? (
          <div className="flex flex-col items-center text-center gap-3">
            {/* One-time code display */}
            <p className="text-xs text-text-secondary">
              Enter this code at{' '}
              <span className="font-medium text-text-primary">github.com/login/device</span>
            </p>
            <div className="flex items-center gap-2">
              <code className="font-mono text-2xl font-semibold tracking-[0.2em] text-text-primary bg-bg-elevated border border-border-secondary rounded-lg px-5 py-3 select-all">
                {code}
              </code>
              <button
                onClick={handleCopy}
                className="p-2 rounded-md text-text-tertiary hover:text-text-primary hover:bg-bg-hover transition-colors duration-200 cursor-pointer"
                aria-label="Copy code"
              >
                {copied ? (
                  <Check size={16} className="text-success" />
                ) : (
                  <Copy size={16} />
                )}
              </button>
            </div>
            <div className="flex items-center gap-2 mt-1">
              <Spinner size="sm" className="text-text-tertiary" />
              <span className="text-xs text-text-tertiary">
                Waiting for browser authentication...
              </span>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 py-2">
            <Spinner size="md" className="text-accent" />
            <span className="text-xs text-text-secondary">
              Starting authentication...
            </span>
          </div>
        )}

        {/* Cancel button */}
        <div className="flex justify-center mt-4">
          <Button variant="ghost" size="sm" icon={X} onClick={onCancel}>
            Cancel
          </Button>
        </div>
      </div>
    </div>
  )
}

/* ─── PrerequisiteCard — individual tool status card ─── */

function PrerequisiteCard({
  prereq,
  installing,
  terminalLines,
  authingGh,
  ghCode,
  onInstall,
  onAuth,
  onCancelAuth,
  index
}: {
  prereq: PrerequisiteStatus
  installing: boolean
  terminalLines: string[]
  authingGh: boolean
  ghCode: string | null
  onInstall: () => void
  onAuth: () => void
  onCancelAuth: () => void
  index: number
}): React.JSX.Element {
  const meta = TOOL_META[prereq.id]
  const Icon = meta.icon

  const isPassed = prereq.installed && (prereq.id !== 'gh' || prereq.authenticated !== false)
  const needsAuth = prereq.id === 'gh' && prereq.installed && prereq.authenticated === false

  return (
    <div
      className="animate-fade-in"
      style={{ animationDelay: `${index * 80 + 100}ms` }}
    >
      <div
        className={`
          bg-bg-elevated rounded-lg border border-border-primary p-4
          transition-all duration-300
          ${isPassed ? 'opacity-60' : ''}
          ${installing ? 'border-accent/30 shadow-accent/5 shadow-md' : ''}
        `}
      >
        <div className="flex items-start gap-3">
          {/* Status icon */}
          <div
            className={`
              mt-0.5 flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center
              transition-colors duration-300
              ${isPassed ? 'bg-success-muted' : needsAuth ? 'bg-warning-muted' : 'bg-bg-tertiary'}
            `}
          >
            {isPassed ? (
              <CheckCircle2 size={16} className="text-success" />
            ) : needsAuth ? (
              <AlertTriangle size={16} className="text-warning" />
            ) : (
              <Icon size={16} className="text-text-secondary" />
            )}
          </div>

          {/* Tool info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-text-primary">{meta.label}</span>
              {isPassed && prereq.version && (
                <Badge variant="success">{prereq.version}</Badge>
              )}
              {needsAuth && !authingGh && (
                <Badge variant="warning">Needs auth</Badge>
              )}
              {authingGh && prereq.id === 'gh' && (
                <Badge variant="accent">Authenticating</Badge>
              )}
              {!prereq.installed && !installing && (
                <Badge variant="danger">Missing</Badge>
              )}
            </div>
            <p className="text-xs text-text-tertiary mt-0.5">{meta.description}</p>
          </div>

          {/* Action button */}
          <div className="flex-shrink-0">
            {!isPassed && !needsAuth && !installing && (
              <Button variant="primary" size="sm" onClick={onInstall}>
                Install
              </Button>
            )}
            {needsAuth && !authingGh && (
              <Button variant="primary" size="sm" onClick={onAuth}>
                Authenticate
              </Button>
            )}
            {installing && (
              <Button variant="primary" size="sm" loading>
                Installing
              </Button>
            )}
          </div>
        </div>

        {/* Terminal output during installation */}
        {installing && terminalLines.length > 0 && (
          <div className="mt-3 animate-fade-in">
            <TerminalOutput lines={terminalLines} title={`Installing ${meta.label}`} />
          </div>
        )}

        {/* GH auth panel */}
        {prereq.id === 'gh' && authingGh && (
          <GhAuthPanel code={ghCode} onCancel={onCancelAuth} />
        )}
      </div>
    </div>
  )
}

/* ─── SetupWizardPage — main export ─── */

export default function SetupWizardPage(): React.JSX.Element {
  const navigate = useNavigate()
  const { status, checking, recheck } = useSetupStatus()

  const [installingId, setInstallingId] = useState<PrerequisiteStatus['id'] | null>(null)
  const [terminalLines, setTerminalLines] = useState<string[]>([])
  const [ghCode, setGhCode] = useState<string | null>(null)
  const [authingGh, setAuthingGh] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Track whether auto-navigation has fired so it only runs once
  const autoNavFired = useRef(false)

  /* ── Event listeners ── */

  useEffect(() => {
    window.api.onSetupOutput((line: string) => {
      setTerminalLines((prev) => [...prev, line])
    })

    window.api.onSetupGhCode((code: string) => {
      setGhCode(code)
    })

    return () => {
      window.api.removeSetupListeners()
    }
  }, [])

  /* ── Auto-navigate when all passed ── */

  useEffect(() => {
    if (!status?.allPassed || autoNavFired.current) return
    autoNavFired.current = true
    const timer = setTimeout(() => {
      navigate('/', { replace: true })
    }, 800)
    return () => clearTimeout(timer)
  }, [status?.allPassed, navigate])

  /* ── Install handler ── */

  const handleInstall = useCallback(
    async (id: PrerequisiteStatus['id']) => {
      setError(null)
      setInstallingId(id)
      setTerminalLines([])

      try {
        const result = await INSTALL_FNS[id]()
        if (!result.success) {
          setError(result.error ?? `Failed to install ${TOOL_META[id].label}.`)
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Installation failed unexpectedly.')
      } finally {
        setInstallingId(null)
        await recheck()
      }
    },
    [recheck]
  )

  /* ── GH auth handler ── */

  const handleAuthGh = useCallback(async () => {
    setError(null)
    setAuthingGh(true)
    setGhCode(null)

    try {
      const result = await window.api.setupAuthGh()
      if (!result.success) {
        setError(result.error ?? 'GitHub authentication failed.')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Authentication failed unexpectedly.')
    } finally {
      setAuthingGh(false)
      await recheck()
    }
  }, [recheck])

  const handleCancelAuth = useCallback(async () => {
    try {
      await window.api.setupCancelAuthGh()
    } catch {
      // Ignore cancel errors
    }
    setAuthingGh(false)
    setGhCode(null)
  }, [])

  /* ── Loading state ── */

  if (checking && !status) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-bg-primary">
        <div className="animate-fade-in flex flex-col items-center gap-4">
          <Spinner size="lg" />
          <p className="text-sm text-text-secondary">Checking prerequisites...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-bg-primary">
      <div className="animate-fade-in flex flex-col items-center max-w-2xl w-full mx-4">
        {/* Main card */}
        <div className="w-full bg-bg-elevated rounded-xl shadow-lg border border-border-primary p-10">
          {/* Header */}
          <div className="flex flex-col items-center text-center mb-8">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-xl bg-accent-muted mb-5">
              <svg
                width="28"
                height="28"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="text-accent"
                />
              </svg>
            </div>
            <h1 className="text-2xl font-semibold text-text-primary tracking-tight">
              Setting Things Up
            </h1>
            <p className="mt-2 text-sm text-text-secondary leading-relaxed max-w-sm">
              Let's make sure you have everything installed
            </p>
          </div>

          {/* Prerequisite cards */}
          <div className="space-y-3">
            {status?.prerequisites.map((prereq, index) => (
              <PrerequisiteCard
                key={prereq.id}
                prereq={prereq}
                installing={installingId === prereq.id}
                terminalLines={installingId === prereq.id ? terminalLines : []}
                authingGh={authingGh}
                ghCode={ghCode}
                onInstall={() => handleInstall(prereq.id)}
                onAuth={handleAuthGh}
                onCancelAuth={handleCancelAuth}
                index={index}
              />
            ))}
          </div>

          {/* Error message */}
          {error && (
            <div className="mt-5 animate-fade-in rounded-lg bg-danger-muted border border-danger/20 px-4 py-3">
              <p className="text-sm text-danger leading-relaxed">{error}</p>
            </div>
          )}

          {/* Bottom actions */}
          <div className="mt-8 flex items-center justify-between">
            <Button
              variant="secondary"
              size="md"
              icon={RefreshCw}
              loading={checking}
              onClick={recheck}
            >
              Re-check All
            </Button>

            <Button
              variant="primary"
              size="md"
              icon={ArrowRight}
              disabled={!status?.allPassed}
              onClick={() => navigate('/', { replace: true })}
            >
              Continue
            </Button>
          </div>

          {/* All-passed success message */}
          {status?.allPassed && (
            <div className="mt-5 animate-scale-in flex items-center justify-center gap-2 text-success">
              <CheckCircle2 size={16} />
              <span className="text-sm font-medium">
                All prerequisites met — redirecting...
              </span>
            </div>
          )}
        </div>

        {/* Footer hint */}
        <p className="mt-6 text-xs text-text-tertiary text-center leading-relaxed">
          These tools are required to build and deploy the Appwrite website.
        </p>
      </div>
    </div>
  )
}
