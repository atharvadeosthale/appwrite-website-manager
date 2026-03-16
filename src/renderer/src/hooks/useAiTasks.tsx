/* eslint-disable react-refresh/only-export-components */
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode
} from 'react'
import { useToast } from '../components/ui/Toast'
import { requestCoverAuditRefresh } from './coverAuditRefresh'
import { requestGitStatusRefresh } from './gitStatusRefresh'

const MAX_CONCURRENT_TASKS = 5

type AiTaskToastMode = 'full' | 'none'

export type AiTaskStatus = 'queued' | 'active' | 'completed' | 'failed'

export interface AiTask {
  id: string
  blogSlug: string
  blogName: string
  prompt: string
  status: AiTaskStatus
  queuedAt: string
  startedAt?: string
  finishedAt?: string
  error?: string
  notify?: boolean
}

interface StartAiTaskInput {
  blogSlug: string
  blogName: string
  prompt: string
}

interface StartAiTaskOptions {
  toastMode?: AiTaskToastMode
}

interface StartAiTaskResult {
  started: boolean
  reason?: 'duplicate'
}

interface StartBulkAiTaskResult {
  queued: number
  skipped: number
}

interface AiTasksContextValue {
  tasks: AiTask[]
  activeCount: number
  queuedCount: number
  hasPendingTaskForBlog: (blogSlug: string) => boolean
  startTask: (input: StartAiTaskInput, options?: StartAiTaskOptions) => Promise<StartAiTaskResult>
  startTasksBulk: (inputs: StartAiTaskInput[]) => Promise<StartBulkAiTaskResult>
  clearFinishedQueue: () => void
}

const AiTasksContext = createContext<AiTasksContextValue | null>(null)

let aiTaskCounter = 0

function createTaskId(): string {
  aiTaskCounter += 1
  return `ai-task-${Date.now()}-${aiTaskCounter}`
}

function getActiveCount(tasks: AiTask[]): number {
  return tasks.filter((task) => task.status === 'active').length
}

function getQueuedCount(tasks: AiTask[]): number {
  return tasks.filter((task) => task.status === 'queued').length
}

function isAuthError(text: string): boolean {
  const lower = text.toLowerCase()
  return (
    lower.includes('not logged in') ||
    lower.includes('not authenticated') ||
    lower.includes('authentication required') ||
    lower.includes('please log in') ||
    lower.includes('login required')
  )
}

export function AiTasksProvider({ children }: { children: ReactNode }): React.JSX.Element {
  const toast = useToast()
  const [tasks, setTasks] = useState<AiTask[]>([])
  const tasksRef = useRef<AiTask[]>([])

  const updateTasks = useCallback((updater: (prev: AiTask[]) => AiTask[]): AiTask[] => {
    const next = updater(tasksRef.current)
    tasksRef.current = next
    setTasks(next)
    return next
  }, [])

  const hasPendingTaskForBlog = useCallback((blogSlug: string): boolean => {
    return tasksRef.current.some(
      (task) => task.blogSlug === blogSlug && (task.status === 'queued' || task.status === 'active')
    )
  }, [])

  const clearFinishedQueue = useCallback(() => {
    updateTasks((prev) =>
      prev.filter((task) => task.status === 'queued' || task.status === 'active')
    )
  }, [updateTasks])

  const runTask = useCallback(
    async (task: AiTask): Promise<void> => {
      console.log(`[ai-tasks] Starting task ${task.id} for "${task.blogSlug}"`)
      try {
        const result = await window.api.writeWithAI(task.blogSlug, task.prompt)

        if (!result.success) {
          updateTasks((prev) =>
            prev.map((entry) =>
              entry.id === task.id
                ? {
                    ...entry,
                    status: 'failed',
                    finishedAt: new Date().toISOString(),
                    error: result.error || 'AI task failed'
                  }
                : entry
            )
          )
          console.error(
            `[ai-tasks] Task ${task.id} failed for "${task.blogSlug}":`,
            result.error || result.output
          )
          if (task.notify) {
            const errorText = [result.error ?? '', result.output ?? ''].join(' ')
            if (isAuthError(errorText)) {
              toast.warning('Claude authentication required. Open setup and complete login.')
            }
            toast.error(`AI task failed for "${task.blogName}".`)
          }
          return
        }

        console.log(`[ai-tasks] AI generation finished for "${task.blogSlug}", running sanitize`)
        const sanitizeResult = await window.api.sanitize(task.blogSlug)

        if (!sanitizeResult.success) {
          updateTasks((prev) =>
            prev.map((entry) =>
              entry.id === task.id
                ? {
                    ...entry,
                    status: 'failed',
                    finishedAt: new Date().toISOString(),
                    error: sanitizeResult.error || 'Sanitize failed after AI generation'
                  }
                : entry
            )
          )
          console.error(
            `[ai-tasks] Sanitize failed for ${task.id} ("${task.blogSlug}") after AI generation:`,
            sanitizeResult.error || sanitizeResult.output
          )
          if (task.notify) {
            toast.error(`AI finished, but sanitize failed for "${task.blogName}".`)
          }
          return
        }

        updateTasks((prev) =>
          prev.map((entry) =>
            entry.id === task.id
              ? {
                  ...entry,
                  status: 'completed',
                  finishedAt: new Date().toISOString(),
                  error: undefined
                }
              : entry
          )
        )

        console.log(`[ai-tasks] Completed task ${task.id} for "${task.blogSlug}"`)
        if (task.notify) {
          toast.success(`AI task completed for "${task.blogName}".`)
        }
      } catch (err) {
        console.error(`[ai-tasks] Task ${task.id} crashed for "${task.blogSlug}":`, err)
        updateTasks((prev) =>
          prev.map((entry) =>
            entry.id === task.id
              ? {
                  ...entry,
                  status: 'failed',
                  finishedAt: new Date().toISOString(),
                  error: err instanceof Error ? err.message : 'AI task failed'
                }
              : entry
          )
        )

        if (task.notify) {
          toast.error(`AI task failed for "${task.blogName}".`)
        }
      } finally {
        requestGitStatusRefresh()
        requestCoverAuditRefresh()
        queueMicrotask(() => {
          launchQueuedRef.current()
        })
      }
    },
    [toast, updateTasks]
  )

  const launchQueuedRef = useRef<() => void>(() => {})

  const launchQueued = useCallback(() => {
    const toLaunch: AiTask[] = []

    updateTasks((prev) => {
      const activeCount = getActiveCount(prev)
      let slots = Math.max(0, MAX_CONCURRENT_TASKS - activeCount)
      if (slots === 0) return prev

      return prev.map((task) => {
        if (slots > 0 && task.status === 'queued') {
          slots -= 1
          const nextTask: AiTask = {
            ...task,
            status: 'active',
            startedAt: new Date().toISOString()
          }
          toLaunch.push(nextTask)
          return nextTask
        }
        return task
      })
    })

    for (const task of toLaunch) {
      console.log(`[ai-tasks] Promoting queued task ${task.id} to active`)
      void runTask(task)
    }
  }, [runTask, updateTasks])
  launchQueuedRef.current = launchQueued

  const startTask = useCallback(
    async (
      { blogSlug, blogName, prompt }: StartAiTaskInput,
      options: StartAiTaskOptions = {}
    ): Promise<StartAiTaskResult> => {
      const toastMode = options.toastMode ?? 'full'
      const shouldNotify = toastMode === 'full'

      if (hasPendingTaskForBlog(blogSlug)) {
        if (shouldNotify) {
          toast.warning(`An AI task for "${blogName}" is already queued or running.`)
        }
        return { started: false, reason: 'duplicate' }
      }

      const taskId = createTaskId()
      const now = new Date().toISOString()
      const task: AiTask = {
        id: taskId,
        blogSlug,
        blogName,
        prompt,
        status: 'queued',
        queuedAt: now,
        notify: shouldNotify
      }

      updateTasks((prev) => [task, ...prev])
      console.log(`[ai-tasks] Queued task ${task.id} for "${blogSlug}"`)

      if (shouldNotify) {
        toast.info(`AI task queued for "${blogName}".`)
      }

      launchQueuedRef.current()

      return { started: true }
    },
    [hasPendingTaskForBlog, toast, updateTasks]
  )

  const startTasksBulk = useCallback(
    async (inputs: StartAiTaskInput[]): Promise<StartBulkAiTaskResult> => {
      let queued = 0
      let skipped = 0

      for (const input of inputs) {
        const result = await startTask(input, { toastMode: 'none' })
        if (result.started) {
          queued += 1
        } else {
          skipped += 1
        }
      }

      console.log(`[ai-tasks] Bulk enqueue complete. Queued: ${queued}, skipped: ${skipped}`)

      return { queued, skipped }
    },
    [startTask]
  )

  const activeCount = useMemo(() => getActiveCount(tasks), [tasks])
  const queuedCount = useMemo(() => getQueuedCount(tasks), [tasks])

  const value = useMemo<AiTasksContextValue>(
    () => ({
      tasks,
      activeCount,
      queuedCount,
      hasPendingTaskForBlog,
      startTask,
      startTasksBulk,
      clearFinishedQueue
    }),
    [
      tasks,
      activeCount,
      queuedCount,
      hasPendingTaskForBlog,
      startTask,
      startTasksBulk,
      clearFinishedQueue
    ]
  )

  return <AiTasksContext.Provider value={value}>{children}</AiTasksContext.Provider>
}

export function useAiTasks(): AiTasksContextValue {
  const context = useContext(AiTasksContext)
  if (!context) {
    throw new Error('useAiTasks must be used within an AiTasksProvider')
  }
  return context
}
