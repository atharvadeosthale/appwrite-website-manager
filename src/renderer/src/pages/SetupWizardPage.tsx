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
    <div className="mt-3 animate-fade-in">
      <div className="rounded-[14px] border border-white/10 bg-[linear-gradient(180deg,rgba(24,24,28,0.94),rgba(12,12,14,0.98))] p-3">
        {code ? (
          <div className="flex flex-col items-center text-center gap-2">
            <p className="text-xs uppercase tracking-[0.16em] text-text-tertiary">
              GitHub device flow
            </p>
            <p className="text-xs text-text-secondary">
              Enter this code at{' '}
              <span className="font-medium text-text-primary">github.com/login/device</span>
            </p>
            <div className="flex items-center gap-2">
              <code className="rounded-[10px] border border-white/10 bg-[#0b0b0d] px-3 py-2 font-mono text-lg font-semibold tracking-[0.16em] text-text-primary select-all">
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
            <div className="mt-1 flex items-center gap-2">
              <Spinner size="sm" className="text-cyan" />
              <span className="text-xs uppercase tracking-[0.14em] text-text-tertiary">
                Waiting for browser authentication...
              </span>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 py-1.5">
            <Spinner size="md" className="text-cyan" />
            <span className="text-xs uppercase tracking-[0.14em] text-text-secondary">
              Starting authentication...
            </span>
          </div>
        )}

        <div className="mt-3 flex justify-center">
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
      style={{ animationDelay: `${index * 60 + 80}ms` }}
    >
      <div
        className={`
          rounded-[12px] border p-3 transition-all duration-300
          bg-[linear-gradient(180deg,rgba(24,24,28,0.95),rgba(12,12,14,0.98))]
          ${isPassed ? 'opacity-70 border-white/8' : 'border-white/10'}
          ${installing ? 'border-white/14 shadow-[0_20px_46px_rgba(0,0,0,0.26)]' : ''}
        `}
      >
        <div className="flex items-start gap-2.5">
          <div
            className={`
              mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-[10px] border
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
              <span className="font-display text-lg text-text-primary">{meta.label}</span>
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
            <p className="mt-0.5 text-xs leading-5 text-text-secondary">
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
  const corePassed = Boolean(status?.allPassed)
  const claudeInstalled = status?.prerequisites.find((p) => p.id === 'claude')?.installed ?? false
  const optionalPending = !claudeInstalled
  const canSkipOptional = !requireClaude && corePassed && optionalPending
  const setupPassed = corePassed && claudeInstalled

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

  const handleSkipOptional = useCallback(() => {
    try {
      sessionStorage.setItem('skipOptionalClaudeSetup', '1')
    } catch {
      // Ignore storage errors and continue navigation.
    }
    navigate('/', { replace: true })
  }, [navigate])

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
      <div className="flex min-h-screen items-center justify-center px-5">
        <div className="surface-panel animate-fade-in flex min-h-[14rem] w-full max-w-md flex-col items-center justify-center gap-3 rounded-[14px]">
          <Spinner size="lg" className="text-cyan" />
          <p className="text-xs text-text-secondary">Checking prerequisites...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-5 sm:px-5">
      <div className="pointer-events-none absolute left-[-7rem] top-[-7rem] h-[14rem] w-[14rem] rounded-full bg-white/6 blur-[90px]" />
      <div className="pointer-events-none absolute bottom-[-7rem] right-[-9rem] h-[15rem] w-[15rem] rounded-full bg-accent/8 blur-[100px]" />
      <div className="animate-fade-in flex w-full max-w-[62rem] flex-col items-center">
        <div className="relative w-full overflow-hidden rounded-[16px] border border-white/10 bg-[linear-gradient(180deg,rgba(26,26,30,0.98),rgba(12,12,14,0.98))] p-4 shadow-[0_20px_50px_rgba(0,0,0,0.26)] sm:p-5">
          <div className="pointer-events-none absolute inset-x-20 top-0 h-px bg-gradient-to-r from-transparent via-white/16 to-transparent" />
          <div className="mb-5 flex flex-col items-center text-center">
            <div className="mb-3 inline-flex h-11 w-11 items-center justify-center rounded-[12px] border border-accent/18 bg-accent-muted text-accent shadow-[0_14px_28px_rgba(255,92,143,0.14)]">
              <svg
                width="20"
                height="20"
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
            <p className="text-[10px] uppercase tracking-[0.18em] text-text-tertiary">Onboarding</p>
            <h1 className="mt-1.5 font-display text-[1.8rem] text-text-primary sm:text-[2.2rem]">
              Setting up the workspace
            </h1>
            <p className="mt-2.5 max-w-2xl text-xs leading-5 text-text-secondary sm:text-sm">
              Install the local tooling stack, authenticate GitHub CLI if needed, set up Claude Code, and unlock the full website management workflow.
            </p>
          </div>

          <div className="grid gap-2.5 lg:grid-cols-2">
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
            <div className="mt-3 animate-fade-in">
              <Button
                variant="primary"
                size="sm"
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
            <div className="mt-4 animate-fade-in rounded-[14px] border border-danger/20 bg-danger-muted px-3 py-3">
              <p className="text-xs leading-6 text-danger">{error}</p>
            </div>
          )}

          {requireClaude && !claudeInstalled && (
            <div className="mt-4 animate-fade-in rounded-[14px] border border-warning/20 bg-warning-muted px-3 py-3">
              <p className="text-xs leading-6 text-warning">
                Claude Code is required to use Write with AI. Install it to continue.
              </p>
            </div>
          )}

          <div className="mt-6 flex flex-wrap items-center justify-between gap-2.5">
            <Button
              variant="secondary"
              size="sm"
              icon={RefreshCw}
              loading={checking}
              onClick={recheck}
            >
              Re-check All
            </Button>

            <div className="flex items-center gap-2">
              {canSkipOptional && (
                <Button variant="ghost" size="sm" onClick={handleSkipOptional}>
                  Skip Optional For Now
                </Button>
              )}
              <Button
                variant="primary"
                size="sm"
                icon={ArrowRight}
                disabled={!setupPassed}
                onClick={() => navigate('/', { replace: true })}
              >
                Continue
              </Button>
            </div>
          </div>

          {setupPassed && (
            <div className="mt-4 animate-scale-in flex items-center justify-center gap-2 text-success">
              <CheckCircle2 size={14} />
              <span className="text-xs font-medium">
                All required prerequisites met — redirecting...
              </span>
            </div>
          )}
        </div>

        <p className="mt-4 text-center text-[11px] leading-relaxed text-text-tertiary">
          Core tools are required to build and deploy the Appwrite website. Claude Code is
          optional and only needed for Write with AI.
        </p>
      </div>
    </div>
  )
}
