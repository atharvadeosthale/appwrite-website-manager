import { useState, useEffect, useCallback, useRef } from 'react'
import clsx from 'clsx'
import { GitBranch, AlertTriangle, ArrowDown, RotateCcw, GitCommit, GitPullRequest, Copy, ExternalLink } from 'lucide-react'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { BranchSelector } from '../shared/BranchSelector'
import { ConfirmDialog } from '../shared/ConfirmDialog'
import { useGitStatus } from '../../hooks/useGitStatus'
import { useDevServer } from '../../hooks/useDevServer'
import { useRefreshKey } from '../../hooks/useRefreshKey'
import { useToast } from '../ui/Toast'

type ConfirmDialogState =
  | { type: 'none' }
  | { type: 'dirty-pull' }
  | { type: 'conflict' }
  | { type: 'switch-branch'; branch: string }
  | { type: 'hard-reset' }

type PopoverState = 'none' | 'commit' | 'create-pr'

/* ─── Popover wrapper (opens upward from StatusBar) ─── */

function StatusBarPopover({
  open,
  onClose,
  children
}: {
  open: boolean
  onClose: () => void
  children: React.ReactNode
}): React.JSX.Element | null {
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const handleClick = (e: MouseEvent): void => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        onClose()
      }
    }
    const handleKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') onClose()
    }
    // Delay adding click listener to avoid immediately closing
    const timer = setTimeout(() => {
      document.addEventListener('mousedown', handleClick)
    }, 0)
    document.addEventListener('keydown', handleKey)
    return () => {
      clearTimeout(timer)
      document.removeEventListener('mousedown', handleClick)
      document.removeEventListener('keydown', handleKey)
    }
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      ref={panelRef}
      className={clsx(
        'absolute bottom-full right-0 z-50 mb-3 w-[22rem] overflow-hidden rounded-[18px] border border-white/10',
        'bg-[linear-gradient(180deg,rgba(26,26,30,0.98),rgba(12,12,14,0.98))] p-4 shadow-[0_28px_80px_rgba(3,7,18,0.48)]',
        'animate-scale-in'
      )}
    >
      <div className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-white/14 to-transparent" />
      {children}
    </div>
  )
}

/* ─── PR Success Dialog ─── */

function PrSuccessDialog({
  open,
  url,
  onClose
}: {
  open: boolean
  url: string
  onClose: () => void
}): React.JSX.Element | null {
  const toast = useToast()

  useEffect(() => {
    if (!open) return
    const handleKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [open, onClose])

  if (!open) return null

  const handleCopy = async (): Promise<void> => {
    try {
      await navigator.clipboard.writeText(url)
      toast.success('PR URL copied to clipboard')
    } catch {
      toast.error('Failed to copy URL')
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
    >
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-md animate-fade-in"
        onClick={onClose}
      />
      <div
        className={clsx(
          'relative w-full max-w-md overflow-hidden rounded-[16px] border border-white/10',
          'bg-[linear-gradient(180deg,rgba(26,26,30,0.98),rgba(12,12,14,0.98))] p-6 shadow-[0_30px_80px_rgba(3,7,18,0.52)]',
          'animate-scale-in'
        )}
      >
        <div className="pointer-events-none absolute inset-x-10 top-0 h-px bg-gradient-to-r from-transparent via-white/14 to-transparent" />
        <p className="text-xs uppercase tracking-[0.18em] text-text-tertiary">GitHub Flow</p>
        <h2 className="mt-2 font-display text-2xl text-text-primary">Pull Request Created</h2>
        <p className="mt-3 break-all text-sm leading-7 text-text-secondary">{url}</p>
        <div className="mt-7 flex items-center justify-end gap-3">
          <Button variant="secondary" size="md" icon={Copy} onClick={handleCopy}>
            Copy Link
          </Button>
          <Button
            variant="primary"
            size="md"
            icon={ExternalLink}
            onClick={() => {
              window.open(url, '_blank')
              onClose()
            }}
          >
            Open
          </Button>
        </div>
      </div>
    </div>
  )
}

/* ─── Main StatusBar ─── */

export function StatusBar(): React.JSX.Element {
  const { branch, status, remoteStatus, loading, refetch } = useGitStatus()
  const { running } = useDevServer()
  const { refresh } = useRefreshKey()
  const toast = useToast()

  const [branches, setBranches] = useState<string[]>([])
  const [switchingBranch, setSwitchingBranch] = useState(false)
  const [pulling, setPulling] = useState(false)
  const [dialog, setDialog] = useState<ConfirmDialogState>({ type: 'none' })

  // Popover state
  const [popover, setPopover] = useState<PopoverState>('none')

  // Commit popover form state
  const [commitMessage, setCommitMessage] = useState('')
  const [newBranchName, setNewBranchName] = useState('')
  const [committing, setCommitting] = useState(false)

  // Create PR popover form state
  const [prTitle, setPrTitle] = useState('')
  const [prBody, setPrBody] = useState('')
  const [creatingPr, setCreatingPr] = useState(false)

  // PR success dialog
  const [prSuccessUrl, setPrSuccessUrl] = useState<string | null>(null)

  const isOnMain = branch === 'main'

  const fetchBranches = useCallback(async () => {
    try {
      const result = await window.api.gitBranches()
      setBranches(result)
    } catch {
      // Silently handle
    }
  }, [])

  useEffect(() => {
    fetchBranches()
  }, [fetchBranches])

  /* ─── Pull flow ─── */

  const executePull = useCallback(async () => {
    setPulling(true)
    try {
      const result = await window.api.gitPull()
      if (result.conflict) {
        // Merge conflict detected -- ask user to hard reset
        setDialog({ type: 'conflict' })
      } else if (result.success) {
        toast.success('Repository updated successfully')
        await refetch()
        refresh()
      } else {
        toast.error('Failed to pull updates')
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to pull updates')
    } finally {
      setPulling(false)
    }
  }, [refetch, toast])

  const handlePull = useCallback(async () => {
    // First check for uncommitted changes
    try {
      const currentStatus = await window.api.gitStatus()
      if (!currentStatus.clean) {
        // Dirty working tree -- warn the user
        setDialog({ type: 'dirty-pull' })
        return
      }
    } catch {
      // If we can't check status, proceed anyway
    }
    await executePull()
  }, [executePull])

  const handleConfirmDirtyPull = useCallback(async () => {
    setDialog({ type: 'none' })
    await executePull()
  }, [executePull])

  const handleConfirmConflictReset = useCallback(async () => {
    setDialog({ type: 'none' })
    setPulling(true)
    try {
      const result = await window.api.gitHardReset()
      if (result.success) {
        toast.success('Repository reset to remote successfully')
        await refetch()
        refresh()
      } else {
        toast.error(result.error || 'Failed to reset repository')
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to reset repository')
    } finally {
      setPulling(false)
    }
  }, [refetch, refresh, toast])

  /* ─── Branch switch flow ─── */

  const handleSwitchBranch = useCallback(
    (newBranch: string) => {
      setDialog({ type: 'switch-branch', branch: newBranch })
    },
    []
  )

  const handleConfirmSwitchBranch = useCallback(async () => {
    if (dialog.type !== 'switch-branch') return
    const targetBranch = dialog.branch
    setDialog({ type: 'none' })
    setSwitchingBranch(true)
    try {
      const result = await window.api.gitSwitch(targetBranch)
      if (result.success) {
        toast.success(`Switched to branch "${targetBranch}"`)
        await refetch()
        await fetchBranches()
      } else {
        toast.error(result.error || `Failed to switch to "${targetBranch}"`)
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to switch branch')
    } finally {
      setSwitchingBranch(false)
    }
  }, [dialog, refetch, fetchBranches, toast])

  /* ─── Reset flow ─── */

  const handleReset = useCallback(() => {
    setDialog({ type: 'hard-reset' })
  }, [])

  const handleConfirmHardReset = useCallback(async () => {
    setDialog({ type: 'none' })
    try {
      const result = await window.api.gitHardReset()
      if (result.success) {
        toast.success('All local changes discarded. Reset to origin/main.')
        await refetch()
        refresh() // refetch all data (blogs, authors, categories) across the app
      } else {
        toast.error(result.error || 'Failed to reset repository')
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to reset repository')
    }
  }, [refetch, refresh, toast])

  /* ─── Commit flow ─── */

  const openCommitPopover = useCallback(() => {
    setCommitMessage('')
    setNewBranchName('')
    setPopover('commit')
  }, [])

  const handleCommit = useCallback(async () => {
    if (!commitMessage.trim()) return
    setCommitting(true)
    try {
      if (isOnMain) {
        // Create branch first, then commit
        if (!newBranchName.trim()) return
        const branchResult = await window.api.gitCreateBranch(newBranchName.trim())
        if (!branchResult.success) {
          toast.error(branchResult.error || 'Failed to create branch')
          setCommitting(false)
          return
        }
      }
      const commitResult = await window.api.gitStageAndCommit(commitMessage.trim())
      if (commitResult.success) {
        toast.success('Changes committed successfully')
        setPopover('none')
        await refetch()
        await fetchBranches()
      } else {
        toast.error(commitResult.error || 'Failed to commit changes')
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to commit')
    } finally {
      setCommitting(false)
    }
  }, [commitMessage, newBranchName, isOnMain, refetch, fetchBranches, toast])

  /* ─── Create PR flow ─── */

  const openPrPopover = useCallback(() => {
    setPrTitle(branch || '')
    setPrBody('')
    setPopover('create-pr')
  }, [branch])

  const handleCreatePr = useCallback(async () => {
    if (!prTitle.trim()) return
    setCreatingPr(true)
    try {
      const result = await window.api.gitCreatePr(prTitle.trim(), prBody.trim())
      if (result.success && result.url) {
        setPopover('none')
        setPrSuccessUrl(result.url)
      } else {
        toast.error(result.error || 'Failed to create pull request')
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create pull request')
    } finally {
      setCreatingPr(false)
    }
  }, [prTitle, prBody, toast])

  /* ─── Dialog close ─── */

  const closeDialog = useCallback(() => {
    setDialog({ type: 'none' })
  }, [])

  const closePopover = useCallback(() => {
    setPopover('none')
  }, [])

  const isNotMain = branch && branch !== 'main'
  const hasDirtyFiles = !!status && !status.clean
  const behindCount = remoteStatus?.behind ?? 0
  const aheadCount = remoteStatus?.ahead ?? 0

  return (
    <div className="border-t border-white/8 bg-[linear-gradient(180deg,rgba(13,13,15,0.98),rgba(8,8,10,0.96))] backdrop-blur-2xl">
      {isNotMain && (
        <div
          className={clsx(
            'mx-4 mt-3 flex items-center gap-2 rounded-[12px] border border-warning/18 bg-warning-muted px-4 py-2',
            'text-xs font-medium text-warning',
            'animate-fade-in'
          )}
        >
          <AlertTriangle size={14} className="shrink-0" />
          <span>
            You&apos;re on branch <span className="font-mono font-semibold">{branch}</span>.
            Switch to <span className="font-mono font-semibold">main</span> for production content.
          </span>
        </div>
      )}

      <div
        className={clsx(
          'flex flex-col gap-4 px-4 py-4 xl:flex-row xl:items-center xl:justify-between',
          'text-xs text-text-secondary'
        )}
      >
        <div className="flex min-w-0 flex-wrap items-center gap-3">
          {branch ? (
            <BranchSelector
              current={branch}
              branches={branches}
              onSwitch={handleSwitchBranch}
              loading={switchingBranch || loading}
            />
          ) : (
            <div className="inline-flex items-center gap-2 rounded-[12px] border border-white/10 bg-white/[0.04] px-3.5 py-2 text-text-tertiary">
              <GitBranch size={14} />
              <span>Loading...</span>
            </div>
          )}

          {hasDirtyFiles && (
            <span className="inline-flex items-center gap-2 rounded-[12px] border border-warning/18 bg-warning-muted px-3 py-2 text-[11px] font-medium uppercase tracking-[0.14em] text-warning">
              <span className="inline-block h-2 w-2 rounded-full bg-warning" />
              {status.files.length} unsaved {status.files.length === 1 ? 'change' : 'changes'}
            </span>
          )}

          <div className="inline-flex items-center gap-3 rounded-[12px] border border-white/10 bg-white/[0.04] px-3.5 py-2">
            <span className="text-[11px] uppercase tracking-[0.14em] text-text-tertiary">Sync</span>
            {remoteStatus && behindCount > 0 && (
              <span className="text-warning font-medium">
                {behindCount} commit{behindCount > 1 ? 's' : ''} behind
              </span>
            )}
            {remoteStatus && aheadCount > 0 && (
              <span className="text-text-secondary font-medium">
                {aheadCount} commit{aheadCount > 1 ? 's' : ''} ahead
              </span>
            )}
            {remoteStatus && behindCount === 0 && aheadCount === 0 && (
              <span className="text-text-tertiary">Up to date</span>
            )}
            {!remoteStatus && <span className="text-text-tertiary">Checking remote</span>}
            {behindCount > 0 && (
              <Button variant="ghost" size="sm" icon={ArrowDown} loading={pulling} onClick={handlePull}>
                Update
              </Button>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 xl:justify-end">
          <Button variant="ghost" size="sm" icon={RotateCcw} onClick={handleReset}>
            Reset
          </Button>

          <div className="relative">
            <Button variant="secondary" size="sm" icon={GitCommit} onClick={openCommitPopover}>
              Commit
            </Button>
            <StatusBarPopover open={popover === 'commit'} onClose={closePopover}>
              <div className="flex flex-col gap-4">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.18em] text-text-tertiary">Commit flow</p>
                  <h3 className="mt-2 font-display text-2xl text-text-primary">
                    {isOnMain ? 'Create Branch & Commit' : 'Commit Changes'}
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-text-secondary">
                    {isOnMain
                      ? 'Protect main by branching first, then stage everything into a named commit.'
                      : 'Stage and commit the current workspace changes.'}
                  </p>
                </div>
                {isOnMain && (
                  <Input
                    label="Branch name"
                    placeholder="e.g. feat/my-blog-post"
                    value={newBranchName}
                    onChange={(e) => setNewBranchName(e.target.value)}
                  />
                )}
                <Input
                  label="Commit message"
                  placeholder="Describe your changes..."
                  value={commitMessage}
                  onChange={(e) => setCommitMessage(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault()
                      handleCommit()
                    }
                  }}
                />
                <Button
                  variant="primary"
                  size="sm"
                  loading={committing}
                  disabled={!commitMessage.trim() || (isOnMain && !newBranchName.trim())}
                  onClick={handleCommit}
                  className="self-end"
                >
                  {isOnMain ? 'Create Branch & Commit' : 'Commit Changes'}
                </Button>
              </div>
            </StatusBarPopover>
          </div>

          <div className="relative">
            <Button
              variant="primary"
              size="sm"
              icon={GitPullRequest}
              onClick={openPrPopover}
              disabled={isOnMain}
              title={isOnMain ? 'Switch to a branch first' : undefined}
            >
              Create PR
            </Button>
            <StatusBarPopover open={popover === 'create-pr'} onClose={closePopover}>
              <div className="flex flex-col gap-4">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.18em] text-text-tertiary">Review flow</p>
                  <h3 className="mt-2 font-display text-2xl text-text-primary">Create Pull Request</h3>
                  <p className="mt-2 text-sm leading-6 text-text-secondary">
                    Package the current branch into a PR and open the resulting GitHub URL.
                  </p>
                </div>
                <Input
                  label="PR Title"
                  placeholder="Pull request title..."
                  value={prTitle}
                  onChange={(e) => setPrTitle(e.target.value)}
                />
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-text-primary select-none">
                    Description
                  </label>
                  <textarea
                    className={clsx(
                      'w-full bg-bg-elevated text-text-primary rounded-md font-sans',
                      'border px-3 py-2 text-sm leading-relaxed',
                      'transition-all duration-200',
                      'placeholder:text-text-tertiary',
                      'border-border-primary hover:border-border-secondary',
                      'focus:border-accent focus:shadow-[0_0_0_3px_var(--color-accent-muted)]',
                      'focus:outline-none',
                      'resize-none'
                    )}
                    rows={4}
                    placeholder="Describe your changes..."
                    value={prBody}
                    onChange={(e) => setPrBody(e.target.value)}
                  />
                </div>
                <Button
                  variant="primary"
                  size="sm"
                  loading={creatingPr}
                  disabled={!prTitle.trim()}
                  onClick={handleCreatePr}
                  className="self-end"
                >
                  Create PR
                </Button>
              </div>
            </StatusBarPopover>
          </div>

          <Button variant="ghost" size="sm" icon={ExternalLink} onClick={() => window.api.openInCursor()}>
            Cursor
          </Button>

          <div className="mx-1 hidden h-5 w-px bg-white/8 xl:block" />

          <span className={clsx('inline-block h-2.5 w-2.5 rounded-full', running ? 'bg-success animate-glow-pulse' : 'bg-text-tertiary')} />
          <span className={clsx('text-[11px] font-medium uppercase tracking-[0.16em]', running ? 'text-success' : 'text-text-tertiary')}>
            {running ? 'Running' : 'Stopped'}
          </span>
        </div>
      </div>

      <ConfirmDialog
        open={dialog.type === 'hard-reset'}
        onClose={closeDialog}
        onConfirm={handleConfirmHardReset}
        title="Reset to origin/main"
        message="This will discard all local changes and reset to origin/main. Continue?"
        confirmLabel="Reset"
        variant="danger"
      />

      <ConfirmDialog
        open={dialog.type === 'dirty-pull'}
        onClose={closeDialog}
        onConfirm={handleConfirmDirtyPull}
        title="Uncommitted changes detected"
        message="You have uncommitted changes in your working directory. Pulling now may cause merge conflicts. Do you want to pull anyway?"
        confirmLabel="Pull anyway"
        variant="default"
      />

      <ConfirmDialog
        open={dialog.type === 'conflict'}
        onClose={closeDialog}
        onConfirm={handleConfirmConflictReset}
        title="Merge conflict detected"
        message="A merge conflict occurred while pulling. Would you like to reset your local branch to match the remote? This will discard any local changes."
        confirmLabel="Reset to remote"
        variant="danger"
      />

      <ConfirmDialog
        open={dialog.type === 'switch-branch'}
        onClose={closeDialog}
        onConfirm={handleConfirmSwitchBranch}
        title="Switch branch"
        message={
          dialog.type === 'switch-branch'
            ? `Switch to branch "${dialog.branch}"? Any uncommitted changes will carry over.`
            : ''
        }
        confirmLabel="Switch"
        variant="default"
      />

      <PrSuccessDialog open={!!prSuccessUrl} url={prSuccessUrl || ''} onClose={() => setPrSuccessUrl(null)} />
    </div>
  )
}
