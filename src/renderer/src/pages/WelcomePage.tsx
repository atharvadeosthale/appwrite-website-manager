import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { FolderOpen, Sparkles, CheckCircle2, ArrowRight } from 'lucide-react'
import { Button } from '../components/ui/Button'
import { Spinner } from '../components/ui/Spinner'

export default function WelcomePage(): React.JSX.Element {
  const navigate = useNavigate()
  const [error, setError] = useState<string | null>(null)
  const [validating, setValidating] = useState(false)
  const [checkingExisting, setCheckingExisting] = useState(true)

  useEffect(() => {
    async function checkExistingRepo(): Promise<void> {
      try {
        const setupResult = await window.api.setupCheckAll()
        let skipOptional = false
        try {
          skipOptional = sessionStorage.getItem('skipOptionalClaudeSetup') === '1'
        } catch {
          // Ignore storage errors.
        }
        const optionalPending = setupResult.prerequisites.some(
          (p) => p.id === 'claude' && !p.installed
        )

        if (!setupResult.allPassed || (optionalPending && !skipOptional)) {
          navigate('/setup', { replace: true })
          return
        }
      } catch {
        // Ignore and continue to repo validation.
      }

      try {
        const path = await window.api.getRepoPath()
        if (path) {
          const result = await window.api.validateRepo(path)
          if (result.valid) {
            navigate('/dashboard', { replace: true })
            return
          }
        }
      } catch {
        // No configured repo path.
      } finally {
        setCheckingExisting(false)
      }
    }

    checkExistingRepo()
  }, [navigate])

  async function handleSelectFolder(): Promise<void> {
    setError(null)
    setValidating(true)

    try {
      const path = await window.api.selectFolder()
      if (!path) {
        setValidating(false)
        return
      }

      const result = await window.api.validateRepo(path)
      if (!result.valid) {
        setError(result.error ?? 'This folder does not appear to be a valid Appwrite website repository.')
        setValidating(false)
        return
      }

      await window.api.setRepoPath(path)
      navigate('/dashboard', { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
      setValidating(false)
    }
  }

  if (checkingExisting) {
    return (
      <div className="flex min-h-screen items-center justify-center px-6">
        <div className="surface-panel flex min-h-[16rem] w-full max-w-md flex-col items-center justify-center rounded-[16px] text-center">
          <Spinner size="lg" className="text-cyan" />
          <p className="mt-5 text-sm text-text-secondary">Checking workspace prerequisites and repository state...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="relative min-h-screen overflow-hidden px-5 py-8 sm:px-6">
      <div className="pointer-events-none absolute left-1/2 top-[-8rem] h-[18rem] w-[18rem] -translate-x-1/2 rounded-full bg-white/6 blur-[100px]" />
      <div className="pointer-events-none absolute right-[-4rem] top-[14rem] h-[16rem] w-[16rem] rounded-full bg-accent/8 blur-[100px]" />
      <div className="relative mx-auto grid min-h-[calc(100vh-4rem)] w-full max-w-6xl items-center gap-6 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="space-y-6 animate-fade-in">
          <span className="panel-label">Website Manager</span>
          <div className="space-y-4">
            <h1 className="page-heading max-w-4xl text-text-primary">
              A sharper command center for your <span className="text-gradient">Appwrite website repo</span>.
            </h1>
            <p className="max-w-2xl text-sm leading-7 text-text-secondary sm:text-base">
              Connect the repository once, then manage authors, posts, imports, sanitization, and git-adjacent publishing workflows from one cinematic desktop workspace.
            </p>
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            <div className="surface-panel rounded-[18px] px-4 py-4">
              <Sparkles size={18} className="text-accent" strokeWidth={1.8} />
              <h2 className="mt-3 font-display text-xl text-text-primary">Polished flows</h2>
              <p className="mt-2 text-sm leading-6 text-text-secondary">Create, edit, import, and sanitize without context switching.</p>
            </div>
            <div className="surface-panel rounded-[18px] px-4 py-4">
              <CheckCircle2 size={20} className="text-cyan" strokeWidth={1.8} />
              <h2 className="mt-3 font-display text-xl text-text-primary">Repo aware</h2>
              <p className="mt-2 text-sm leading-6 text-text-secondary">Validate the folder and stay grounded in the current source of truth.</p>
            </div>
            <div className="surface-panel rounded-[18px] px-4 py-4">
              <ArrowRight size={20} className="text-success" strokeWidth={1.8} />
              <h2 className="mt-3 font-display text-xl text-text-primary">Ready to publish</h2>
              <p className="mt-2 text-sm leading-6 text-text-secondary">Move from setup to content operations with minimal friction.</p>
            </div>
          </div>
        </div>

        <div className="animate-fade-in" style={{ animationDelay: '120ms' }}>
          <div className="glass-panel surface-highlight rounded-[18px] p-5 sm:p-6">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-[14px] border border-accent/18 bg-accent-muted text-accent shadow-[0_18px_34px_rgba(255,92,143,0.14)]">
                <FolderOpen size={20} strokeWidth={1.9} />
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-text-tertiary">Onboard workspace</p>
                <h2 className="mt-1 font-display text-[1.75rem] text-text-primary">Select repository</h2>
              </div>
            </div>

            <p className="mt-5 text-sm leading-7 text-text-secondary">
              Choose the root folder of your cloned Appwrite website repository. Once connected, the app can read metadata, generate files, and run maintenance tasks safely inside that workspace.
            </p>

            <div className="mt-6 space-y-3 rounded-[16px] border border-white/8 bg-white/[0.04] p-4">
              <div className="flex items-start gap-3">
                <span className="mt-1 h-2.5 w-2.5 rounded-full bg-cyan" />
                <p className="text-sm leading-7 text-text-secondary">We verify the folder before saving it as your active workspace.</p>
              </div>
              <div className="flex items-start gap-3">
                <span className="mt-1 h-2.5 w-2.5 rounded-full bg-accent" />
                <p className="text-sm leading-7 text-text-secondary">You can switch repositories later from the sidebar at any time.</p>
              </div>
            </div>

            <div className="mt-7 flex flex-wrap items-center gap-3">
              <Button variant="primary" size="lg" icon={FolderOpen} loading={validating} onClick={handleSelectFolder}>
                Select Folder
              </Button>
              <span className="text-xs uppercase tracking-[0.18em] text-text-tertiary">Root directory only</span>
            </div>

            {error && <p className="mt-5 rounded-[14px] border border-danger/20 bg-danger-muted px-4 py-3 text-sm leading-7 text-danger">{error}</p>}
          </div>
        </div>
      </div>
    </div>
  )
}
