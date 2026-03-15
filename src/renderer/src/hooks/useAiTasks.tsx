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

export type AiTaskStatus = 'active' | 'completed' | 'failed'

export interface AiTask {
  id: string
  blogSlug: string
  blogName: string
  prompt: string
  status: AiTaskStatus
  startedAt: string
  finishedAt?: string
  error?: string
}

interface StartAiTaskInput {
  blogSlug: string
  blogName: string
  prompt: string
}

interface StartAiTaskResult {
  started: boolean
  reason?: 'duplicate' | 'cancelled'
}

interface AiTasksContextValue {
  tasks: AiTask[]
  activeCount: number
  hasActiveTaskForBlog: (blogSlug: string) => boolean
  startTask: (input: StartAiTaskInput) => Promise<StartAiTaskResult>
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

  const updateTasks = useCallback((updater: (prev: AiTask[]) => AiTask[]) => {
    setTasks((prev) => {
      const next = updater(prev)
      tasksRef.current = next
      return next
    })
  }, [])

  const hasActiveTaskForBlog = useCallback((blogSlug: string): boolean => {
    return tasksRef.current.some((task) => task.blogSlug === blogSlug && task.status === 'active')
  }, [])

  const clearFinishedQueue = useCallback(() => {
    updateTasks((prev) => prev.filter((task) => task.status === 'active'))
  }, [updateTasks])

  const startTask = useCallback(
    async ({ blogSlug, blogName, prompt }: StartAiTaskInput): Promise<StartAiTaskResult> => {
      if (hasActiveTaskForBlog(blogSlug)) {
        toast.warning(`An AI task for "${blogName}" is already running.`)
        return { started: false, reason: 'duplicate' }
      }

      const nextActiveCount = getActiveCount(tasksRef.current) + 1
      if (nextActiveCount >= 5) {
        const proceed = window.confirm(
          'You are starting many AI tasks. This can quickly deplete Claude usage and hamper machine performance. Do you want to continue?'
        )
        if (!proceed) {
          return { started: false, reason: 'cancelled' }
        }
      }

      const taskId = createTaskId()
      const now = new Date().toISOString()
      const task: AiTask = {
        id: taskId,
        blogSlug,
        blogName,
        prompt,
        status: 'active',
        startedAt: now
      }

      updateTasks((prev) => [task, ...prev])
      toast.info(`AI task started for "${blogName}".`)

      void (async () => {
        try {
          const result = await window.api.writeWithAI(blogSlug, prompt)
          updateTasks((prev) =>
            prev.map((entry) =>
              entry.id === taskId
                ? {
                    ...entry,
                    status: result.success ? 'completed' : 'failed',
                    finishedAt: new Date().toISOString(),
                    error: result.success ? undefined : result.error || 'AI task failed'
                  }
                : entry
            )
          )

          if (result.success) {
            toast.success(`AI task completed for "${blogName}".`)
          } else {
            const errorText = [result.error ?? '', result.output ?? ''].join(' ')
            if (isAuthError(errorText)) {
              toast.warning('Claude authentication required. Open setup and complete login.')
            }
            toast.error(`AI task failed for "${blogName}".`)
          }
        } catch (err) {
          updateTasks((prev) =>
            prev.map((entry) =>
              entry.id === taskId
                ? {
                    ...entry,
                    status: 'failed',
                    finishedAt: new Date().toISOString(),
                    error: err instanceof Error ? err.message : 'AI task failed'
                  }
                : entry
            )
          )
          toast.error(`AI task failed for "${blogName}".`)
        }
      })()

      return { started: true }
    },
    [hasActiveTaskForBlog, toast, updateTasks]
  )

  const activeCount = useMemo(() => getActiveCount(tasks), [tasks])

  const value = useMemo<AiTasksContextValue>(
    () => ({
      tasks,
      activeCount,
      hasActiveTaskForBlog,
      startTask,
      clearFinishedQueue
    }),
    [tasks, activeCount, hasActiveTaskForBlog, startTask, clearFinishedQueue]
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
