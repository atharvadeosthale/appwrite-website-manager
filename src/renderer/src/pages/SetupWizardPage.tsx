import { useState, useEffect, useCallback, useRef } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
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
  Download,
  X,
  Bot
} from 'lucide-react'
import { Button } from '../components/ui/Button'
import { Badge } from '../components/ui/Badge'
import { Spinner } from '../components/ui/Spinner'
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
  gh: { label: 'GitHub CLI', description: 'GitHub command-line tool', icon: Github },
  claude: { label: 'Claude Code', description: 'AI coding assistant CLI', icon: Bot }
}

const INSTALL_FNS: Record<PrerequisiteStatus['id'], () => Promise<InstallResult>> = {
  git: () => window.api.setupInstallGit(),
  node: () => window.api.setupInstallNode(),
  bun: () => window.api.setupInstallBun(),
  gh: () => window.api.setupInstallGh(),
  claude: () => window.api.setupInstallClaude()
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
      <div className="rounded-[16px] border border-white/10 bg-[linear-gradient(180deg,rgba(24,24,28,0.94),rgba(12,12,14,0.98))] p-4">
        {code ? (
          <div className="flex flex-col items-center text-center gap-3">
            <p className="text-xs uppercase tracking-[0.16em] text-text-tertiary">
              GitHub device flow
            </p>
            <p className="text-sm text-text-secondary">
              Enter this code at{' '}
              <span className="font-medium text-text-primary">github.com/login/device</span>
            </p>
            <div className="flex items-center gap-2">
              <code className="rounded-[12px] border border-white/10 bg-[#0b0b0d] px-4 py-2.5 font-mono text-xl font-semibold tracking-[0.2em] text-text-primary select-all">
                {code}
              </code>
              <button
                onClick={handleCopy}
                className="rounded-2xl border border-white/8 bg-white/[0.04] p-2 text-text-tertiary transition-colors duration-200 hover:text-text-primary hover:bg-white/[0.08] cursor-pointer"
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
              <Spinner size="sm" className="text-cyan" />
              <span className="text-xs uppercase tracking-[0.14em] text-text-tertiary">
                Waiting for browser authentication...
              </span>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 py-2">
            <Spinner size="md" className="text-cyan" />
            <span className="text-xs uppercase tracking-[0.14em] text-text-secondary">
              Starting authentication...
            </span>
          </div>
        )}

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
  authingGh,
  ghCode,
  disabled,
  onInstall,
  onAuth,
  onCancelAuth,
  index
}: {
  prereq: PrerequisiteStatus
  installing: boolean
  authingGh: boolean
  ghCode: string | null
  disabled: boolean
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
          rounded-[14px] border p-4 transition-all duration-300
          bg-[linear-gradient(180deg,rgba(24,24,28,0.95),rgba(12,12,14,0.98))]
          ${isPassed ? 'opacity-70 border-white/8' : 'border-white/10'}
          ${installing ? 'border-white/14 shadow-[0_20px_46px_rgba(0,0,0,0.26)]' : ''}
        `}
      >
        <div className="flex items-start gap-3">
          <div
            className={`
              mt-0.5 flex-shrink-0 w-10 h-10 rounded-[12px] flex items-center justify-center border
              transition-colors duration-300
              ${isPassed ? 'bg-success-muted border-success/18' : needsAuth ? 'bg-warning-muted border-warning/18' : 'bg-white/[0.04] border-white/8'}
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

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-display text-xl text-text-primary">{meta.label}</span>
              {isPassed && prereq.version && (
                <Badge variant="success">{prereq.version}</Badge>
              )}
              {prereq.id === 'claude' && <Badge variant="default">Optional</Badge>}
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
            <p className="mt-1 text-sm leading-6 text-text-secondary">
              {meta.description}
              {disabled && ' — install Git first'}
            </p>
          </div>

          <div className="flex-shrink-0">
            {!isPassed && !needsAuth && !installing && (
              <Button variant="primary" size="sm" onClick={onInstall} disabled={disabled}>
                Install
              </Button>
            )}
            {needsAuth && !authingGh && (
              <Button variant="primary" size="sm" onClick={onAuth} disabled={disabled}>
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

        {prereq.id === 'gh' && authingGh && (
          <GhAuthPanel code={ghCode} onCancel={onCancelAuth} />
        )}
      </div>
    </div>
  )
}

/* ─── SetupWizardPage — main export ─── */

export default function SetupWizardPage(): React.JSX.Element {
  const location = useLocation()
  const navigate = useNavigate()
  const { status, checking, recheck } = useSetupStatus()

  const [installingId, setInstallingId] = useState<PrerequisiteStatus['id'] | null>(null)
  const [installingAll, setInstallingAll] = useState(false)
  const [ghCode, setGhCode] = useState<string | null>(null)
  const [authingGh, setAuthingGh] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Track whether auto-navigation has fired so it only runs once
  const autoNavFired = useRef(false)
  const requireClaude = Boolean(
    (location.state as { requireClaude?: boolean } | null)?.requireClaude
  )
  const claudeInstalled = status?.prerequisites.find((p) => p.id === 'claude')?.installed ?? false
  const setupPassed = Boolean(status?.allPassed && (!requireClaude || claudeInstalled))

  /* ── Event listeners ── */

  useEffect(() => {
    window.api.onSetupGhCode((code: string) => {
      setGhCode(code)
    })

    return () => {
      window.api.removeSetupListeners()
    }
  }, [])

  /* ── Auto-navigate when all passed ── */

  useEffect(() => {
    if (!setupPassed || autoNavFired.current) return
    autoNavFired.current = true
    const timer = setTimeout(() => {
      navigate('/', { replace: true })
    }, 800)
    return () => clearTimeout(timer)
  }, [setupPassed, navigate])

  /* ── Install handler ── */

  const handleInstall = useCallback(
    async (id: PrerequisiteStatus['id']) => {
      setError(null)
      setInstallingId(id)

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

  /* ── Install All handler ── */

  const handleInstallAll = useCallback(async () => {
    setError(null)
    setInstallingAll(true)

    try {
      const result = await window.api.setupInstallAll()
      if (!result.success) {
        setError(result.error ?? 'Install All failed.')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Install All failed unexpectedly.')
    } finally {
      setInstallingAll(false)
      await recheck()
    }
  }, [recheck])

  /* ── Derived state ── */

  const gitInstalled = status?.prerequisites.find((p) => p.id === 'git')?.installed ?? false
  const isMac = status?.platform === 'darwin'
  const busy = installingId !== null || installingAll || authingGh

  // Show "Install All" when git is done and there are still uninstalled non-git tools
  const uninstalledNonGit = status?.prerequisites.filter(
    (p) => p.id !== 'git' && !p.installed
  ) ?? []
  const showInstallAll = gitInstalled && uninstalledNonGit.length > 1

  /* ── Loading state ── */

  if (checking && !status) {
    return (
      <div className="flex items-center justify-center min-h-screen px-6">
        <div className="surface-panel animate-fade-in flex min-h-[20rem] w-full max-w-lg flex-col items-center justify-center rounded-[16px] gap-4">
          <Spinner size="lg" className="text-cyan" />
          <p className="text-sm text-text-secondary">Checking prerequisites...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-5 py-8 sm:px-6">
      <div className="pointer-events-none absolute left-[-6rem] top-[-6rem] h-[16rem] w-[16rem] rounded-full bg-white/6 blur-[100px]" />
      <div className="pointer-events-none absolute right-[-8rem] bottom-[-6rem] h-[18rem] w-[18rem] rounded-full bg-accent/8 blur-[110px]" />
      <div className="animate-fade-in flex max-w-5xl w-full flex-col items-center">
        <div className="relative w-full overflow-hidden rounded-[18px] border border-white/10 bg-[linear-gradient(180deg,rgba(26,26,30,0.98),rgba(12,12,14,0.98))] p-6 shadow-[0_24px_60px_rgba(0,0,0,0.28)] sm:p-8">
          <div className="pointer-events-none absolute inset-x-20 top-0 h-px bg-gradient-to-r from-transparent via-white/16 to-transparent" />
          <div className="mb-8 flex flex-col items-center text-center">
            <div className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-[14px] border border-accent/18 bg-accent-muted text-accent shadow-[0_18px_36px_rgba(255,92,143,0.14)]">
              <svg
                width="24"
                height="24"
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
            <p className="text-xs uppercase tracking-[0.18em] text-text-tertiary">Onboarding</p>
            <h1 className="mt-2 font-display text-4xl text-text-primary sm:text-[2.75rem]">
              Setting up the workspace
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-text-secondary sm:text-base">
              Install the local tooling stack, authenticate GitHub CLI if needed, set up Claude Code, and unlock the full website management workflow.
            </p>
          </div>

          <div className="grid gap-3 lg:grid-cols-2">
            {status?.prerequisites.map((prereq, index) => {
              const needsGitFirst = isMac && prereq.id !== 'git' && !gitInstalled

              return (
                <PrerequisiteCard
                  key={prereq.id}
                  prereq={prereq}
                  installing={installingId === prereq.id}
                  authingGh={authingGh}
                  ghCode={ghCode}
                  disabled={needsGitFirst || (busy && installingId !== prereq.id)}
                  onInstall={() => handleInstall(prereq.id)}
                  onAuth={handleAuthGh}
                  onCancelAuth={handleCancelAuth}
                  index={index}
                />
              )
            })}
          </div>

          {showInstallAll && (
            <div className="mt-4 animate-fade-in">
              <Button
                variant="primary"
                size="md"
                icon={Download}
                loading={installingAll}
                disabled={busy && !installingAll}
                onClick={handleInstallAll}
                className="w-full"
              >
                {installingAll ? 'Installing...' : `Install All (${uninstalledNonGit.length} tools)`}
              </Button>
            </div>
          )}

          {error && (
            <div className="mt-5 animate-fade-in rounded-[16px] border border-danger/20 bg-danger-muted px-4 py-4">
              <p className="text-sm leading-7 text-danger">{error}</p>
            </div>
          )}

          {requireClaude && !claudeInstalled && (
            <div className="mt-5 animate-fade-in rounded-[16px] border border-warning/20 bg-warning-muted px-4 py-4">
              <p className="text-sm leading-7 text-warning">
                Claude Code is required to use Write with AI. Install it to continue.
              </p>
            </div>
          )}

          <div className="mt-8 flex flex-wrap items-center justify-between gap-3">
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
              disabled={!setupPassed}
              onClick={() => navigate('/', { replace: true })}
            >
              Continue
            </Button>
          </div>

          {setupPassed && (
            <div className="mt-5 animate-scale-in flex items-center justify-center gap-2 text-success">
              <CheckCircle2 size={16} />
              <span className="text-sm font-medium">
                All required prerequisites met — redirecting...
              </span>
            </div>
          )}
        </div>

        <p className="mt-6 text-center text-xs leading-relaxed text-text-tertiary">
          Core tools are required to build and deploy the Appwrite website. Claude Code is
          optional and only needed for Write with AI.
        </p>
      </div>
    </div>
  )
}
