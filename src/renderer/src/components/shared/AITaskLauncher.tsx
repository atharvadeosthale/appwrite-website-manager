import { useEffect, useMemo, useRef, useState } from 'react'
import clsx from 'clsx'
import {
  Sparkles,
  Loader2,
  CheckCircle2,
  AlertCircle,
  ChevronUp,
  ChevronDown,
  X
} from 'lucide-react'
import { useAiTasks, type AiTask } from '../../hooks/useAiTasks'

interface TaskGroup {
  blogSlug: string
  blogName: string
  tasks: AiTask[]
}

function groupByBlog(tasks: AiTask[]): TaskGroup[] {
  const grouped = new Map<string, TaskGroup>()

  for (const task of tasks) {
    const existing = grouped.get(task.blogSlug)
    if (existing) {
      existing.tasks.push(task)
      continue
    }
    grouped.set(task.blogSlug, {
      blogSlug: task.blogSlug,
      blogName: task.blogName,
      tasks: [task]
    })
  }

  return Array.from(grouped.values()).sort((a, b) => {
    const aTime = new Date(a.tasks[0]?.finishedAt ?? a.tasks[0]?.startedAt ?? 0).getTime()
    const bTime = new Date(b.tasks[0]?.finishedAt ?? b.tasks[0]?.startedAt ?? 0).getTime()
    return bTime - aTime
  })
}

function formatTime(value?: string): string {
  if (!value) return ''
  try {
    return new Date(value).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit'
    })
  } catch {
    return ''
  }
}

function TaskGroupCard({
  group,
  type,
  onClick
}: {
  group: TaskGroup
  type: 'active' | 'finished'
  onClick?: () => void
}): React.JSX.Element {
  const completedCount = group.tasks.filter((task) => task.status === 'completed').length
  const failedCount = group.tasks.filter((task) => task.status === 'failed').length
  const latest = group.tasks[0]
  const clickable = !!onClick

  return (
    <div
      role={clickable ? 'button' : undefined}
      tabIndex={clickable ? 0 : undefined}
      onClick={onClick}
      onKeyDown={(event) => {
        if (!onClick) return
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          onClick()
        }
      }}
      className={clsx(
        'rounded-[14px] border border-white/8 bg-white/[0.03] px-3.5 py-3',
        clickable &&
          'cursor-pointer transition-colors duration-150 hover:border-white/16 hover:bg-white/[0.05] focus:outline-none focus:ring-2 focus:ring-white/20'
      )}
      title={clickable ? `Open ${group.blogName}` : undefined}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-text-primary">{group.blogName}</p>
          <p className="mt-1 text-xs text-text-tertiary">
            <span className="muted-code">{group.blogSlug}</span>
          </p>
        </div>
        {type === 'active' ? (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-accent/20 bg-accent-muted px-2.5 py-1 text-[11px] font-medium text-accent">
            <Loader2 size={12} className="animate-spin" />
            Running
          </span>
        ) : (
          <span
            className={clsx(
              'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium',
              failedCount > 0
                ? 'border-danger/20 bg-danger-muted text-danger'
                : 'border-success/20 bg-success-muted text-success'
            )}
          >
            {failedCount > 0 ? <AlertCircle size={12} /> : <CheckCircle2 size={12} />}
            {failedCount > 0 ? 'Issues' : 'Done'}
          </span>
        )}
      </div>
      {type === 'finished' && (
        <p className="mt-3 text-xs text-text-secondary">
          {completedCount > 0 ? `${completedCount} complete` : null}
          {completedCount > 0 && failedCount > 0 ? ' • ' : null}
          {failedCount > 0 ? `${failedCount} failed` : null}
          {latest?.finishedAt ? ` • ${formatTime(latest.finishedAt)}` : ''}
        </p>
      )}
      {type === 'active' && latest?.startedAt && (
        <p className="mt-3 text-xs text-text-secondary">Started {formatTime(latest.startedAt)}</p>
      )}
    </div>
  )
}

export function AITaskLauncher(): React.JSX.Element | null {
  const { tasks, activeCount, clearFinishedQueue } = useAiTasks()
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const activeTasks = useMemo(() => tasks.filter((task) => task.status === 'active'), [tasks])
  const finishedTasks = useMemo(() => tasks.filter((task) => task.status !== 'active'), [tasks])

  const activeGroups = useMemo(() => groupByBlog(activeTasks), [activeTasks])
  const finishedGroups = useMemo(() => groupByBlog(finishedTasks), [finishedTasks])

  const canClearQueue = activeCount === 0 && finishedTasks.length > 0

  const openEditPage = (blogSlug: string): void => {
    window.location.assign(`#/dashboard/blogs/${blogSlug}/edit`)
    setOpen(false)
  }

  useEffect(() => {
    if (!open) return
    const onPointerDown = (event: MouseEvent): void => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') setOpen(false)
    }

    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  if (tasks.length === 0) return null

  return (
    <div ref={containerRef} className="fixed bottom-5 right-5 z-[70]">
      {open && (
        <div className="mb-3 w-[22.5rem] overflow-hidden rounded-[18px] border border-white/10 bg-[linear-gradient(180deg,rgba(26,26,30,0.98),rgba(12,12,14,0.98))] p-4 shadow-[0_30px_80px_rgba(3,7,18,0.48)] animate-scale-in">
          <div className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-white/14 to-transparent" />
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[11px] uppercase tracking-[0.18em] text-text-tertiary">AI Tasks</p>
              <h3 className="mt-1 font-display text-2xl text-text-primary">Task Queue</h3>
            </div>
            {canClearQueue && (
              <button
                type="button"
                onClick={() => {
                  clearFinishedQueue()
                  setOpen(false)
                }}
                className="inline-flex h-8 w-8 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.05] text-text-tertiary transition-colors duration-150 hover:text-text-primary"
                title="Clear finished queue"
              >
                <X size={14} />
              </button>
            )}
          </div>

          <div className="mt-4 space-y-4">
            <div>
              <p className="text-[11px] uppercase tracking-[0.14em] text-accent">
                Active ({activeTasks.length})
              </p>
              <div className="mt-2 space-y-2.5">
                {activeGroups.length > 0 ? (
                  activeGroups.map((group) => (
                    <TaskGroupCard key={`active-${group.blogSlug}`} group={group} type="active" />
                  ))
                ) : (
                  <p className="rounded-[14px] border border-white/8 bg-white/[0.03] px-3.5 py-3 text-xs text-text-tertiary">
                    No active tasks.
                  </p>
                )}
              </div>
            </div>

            <div>
              <p className="text-[11px] uppercase tracking-[0.14em] text-text-secondary">
                Completed ({finishedTasks.length})
              </p>
              <div className="mt-2 max-h-56 space-y-2.5 overflow-y-auto pr-1">
                {finishedGroups.length > 0 ? (
                  finishedGroups.map((group) => (
                    <TaskGroupCard
                      key={`finished-${group.blogSlug}-${group.tasks.length}`}
                      group={group}
                      type="finished"
                      onClick={() => openEditPage(group.blogSlug)}
                    />
                  ))
                ) : (
                  <p className="rounded-[14px] border border-white/8 bg-white/[0.03] px-3.5 py-3 text-xs text-text-tertiary">
                    Nothing finished yet.
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="relative">
        <button
          type="button"
          onClick={() => setOpen((current) => !current)}
          className="relative inline-flex h-14 w-14 items-center justify-center rounded-full border border-accent/24 bg-[linear-gradient(180deg,rgba(255,92,143,0.26),rgba(255,92,143,0.12))] text-accent shadow-[0_20px_44px_rgba(255,92,143,0.26)] transition-transform duration-200 hover:-translate-y-0.5"
          title={open ? 'Hide AI tasks' : 'Show AI tasks'}
        >
          {activeCount > 0 ? (
            <Loader2 size={22} className="animate-spin" />
          ) : (
            <Sparkles size={22} />
          )}
          {open ? (
            <ChevronDown size={14} className="absolute -top-1 -right-1 rounded-full bg-bg-secondary p-0.5 text-text-secondary" />
          ) : (
            <ChevronUp size={14} className="absolute -top-1 -right-1 rounded-full bg-bg-secondary p-0.5 text-text-secondary" />
          )}
        </button>

        {activeCount > 0 && (
          <span className="absolute -right-1.5 -top-1.5 inline-flex min-h-6 min-w-6 items-center justify-center rounded-full border border-white/16 bg-bg-secondary px-1.5 text-xs font-semibold text-text-primary shadow-[0_10px_24px_rgba(0,0,0,0.35)]">
            {activeCount}
          </span>
        )}

        {canClearQueue && (
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation()
              clearFinishedQueue()
              setOpen(false)
            }}
            className="absolute -left-1.5 -top-1.5 inline-flex h-6 w-6 items-center justify-center rounded-full border border-white/16 bg-bg-secondary text-text-secondary transition-colors duration-150 hover:text-text-primary"
            title="Clear finished queue"
          >
            <X size={12} />
          </button>
        )}
      </div>
    </div>
  )
}
