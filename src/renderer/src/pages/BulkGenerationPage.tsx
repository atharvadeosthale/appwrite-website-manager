import { useCallback, useMemo, useState, useEffect } from 'react'
import clsx from 'clsx'
import {
  Plus,
  Sparkles,
  Copy,
  Trash2,
  Image as ImageIcon,
  X,
  CheckCircle2,
  AlertTriangle,
  Loader2
} from 'lucide-react'
import { useAuthors } from '../hooks/useAuthors'
import { useBlogs } from '../hooks/useBlogs'
import { useCategories } from '../hooks/useCategories'
import { useAiTasks } from '../hooks/useAiTasks'
import { useCoverTemplates } from '../hooks/useCoverTemplates'
import { requestGitStatusRefresh } from '../hooks/gitStatusRefresh'
import { requestCoverAuditRefresh } from '../hooks/coverAuditRefresh'
import { useToast } from '../components/ui/Toast'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Select } from '../components/ui/Select'
import { Toggle } from '../components/ui/Toggle'
import { Spinner } from '../components/ui/Spinner'
import { FormField } from '../components/forms/FormField'
import { AuthorDropdown } from '../components/shared/AuthorDropdown'
import { InfoPill, PageIntro, PageScaffold, SurfaceCard } from '../components/layout/PageScaffold'
import type { CoverTemplate, CreateBlogOptions } from '../types'

type RowStatus = 'idle' | 'creating' | 'created' | 'queued' | 'failed'

interface BulkRow {
  id: string
  title: string
  slug: string
  slugManual: boolean
  description: string
  category: string
  prompt: string
  generateCover: boolean
  coverTemplateId: string
  coverPath: string
  status: RowStatus
  coverWarning?: string
  generatedCoverText?: string
  error?: string
}

interface RowErrors {
  title?: string
  slug?: string
  description?: string
  category?: string
  coverTemplateId?: string
}

interface BulkSummary {
  attempted: number
  created: number
  queued: number
  failed: number
}

let bulkRowCounter = 0

function createRowId(): string {
  bulkRowCounter += 1
  return `bulk-row-${Date.now()}-${bulkRowCounter}`
}

function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
}

function todayString(): string {
  const date = new Date()
  const yyyy = date.getFullYear()
  const mm = String(date.getMonth() + 1).padStart(2, '0')
  const dd = String(date.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

function resetRowRuntimeState(row: BulkRow): BulkRow {
  return {
    ...row,
    status: 'idle',
    error: undefined,
    coverWarning: undefined,
    generatedCoverText: undefined
  }
}

function appendWarning(current: string | undefined, next: string): string {
  const trimmedNext = next.trim()
  if (!trimmedNext) return current ?? ''
  if (!current) return trimmedNext
  return `${current} ${trimmedNext}`
}

function createEmptyRow(overrides: Partial<BulkRow> = {}): BulkRow {
  return {
    id: createRowId(),
    title: '',
    slug: '',
    slugManual: false,
    description: '',
    category: '',
    prompt: '',
    generateCover: true,
    coverTemplateId: 'default',
    coverPath: '',
    status: 'idle',
    ...overrides
  }
}

function getStatusPill(
  status: RowStatus,
  hasErrors: boolean
): { label: string; className: string; icon?: React.JSX.Element } {
  if (status === 'creating') {
    return {
      label: 'Creating',
      className: 'border-accent/20 bg-accent-muted text-accent',
      icon: <Loader2 size={12} className="animate-spin" />
    }
  }

  if (status === 'queued') {
    return {
      label: 'Queued',
      className: 'border-success/20 bg-success-muted text-success',
      icon: <CheckCircle2 size={12} />
    }
  }

  if (status === 'created') {
    return {
      label: 'Created',
      className: 'border-cyan/20 bg-cyan-muted text-cyan',
      icon: <CheckCircle2 size={12} />
    }
  }

  if (status === 'failed' || hasErrors) {
    return {
      label: 'Needs attention',
      className: 'border-danger/20 bg-danger-muted text-danger',
      icon: <AlertTriangle size={12} />
    }
  }

  return {
    label: 'Ready',
    className: 'border-white/12 bg-white/[0.04] text-text-secondary'
  }
}

function getPathFileName(path: string): string {
  const normalized = path.replace(/\\/g, '/')
  return normalized.split('/').pop() ?? path
}

export default function BulkGenerationPage(): React.JSX.Element {
  const toast = useToast()
  const { authors, loading: authorsLoading } = useAuthors()
  const { blogs, loading: blogsLoading } = useBlogs()
  const { categories, loading: categoriesLoading } = useCategories()
  const { startTask } = useAiTasks()
  const {
    templates: coverTemplates,
    loading: coverTemplatesLoading,
    error: coverTemplatesError,
    refresh: refreshCoverTemplates
  } = useCoverTemplates()

  const [author, setAuthor] = useState('')
  const [date, setDate] = useState(todayString())
  const [timeToRead, setTimeToRead] = useState(5)
  const [featured, setFeatured] = useState(false)
  const [unlisted, setUnlisted] = useState(true)
  const [repoPath, setRepoPath] = useState('')

  const [rows, setRows] = useState<BulkRow[]>([createEmptyRow()])
  const [globalErrors, setGlobalErrors] = useState<Record<string, string>>({})
  const [rowErrors, setRowErrors] = useState<Record<string, RowErrors>>({})
  const [running, setRunning] = useState(false)
  const [summary, setSummary] = useState<BulkSummary | null>(null)

  useEffect(() => {
    if (!author && authors.length > 0) {
      setAuthor(authors[0].slug)
    }
  }, [author, authors])

  useEffect(() => {
    window.api.getRepoPath().then(setRepoPath).catch(() => {})
  }, [])

  const loading = authorsLoading || blogsLoading || categoriesLoading

  const categoryOptions = useMemo(
    () => categories.map((category) => ({ value: category.slug, label: category.name })),
    [categories]
  )

  const coverTemplateOptions = useMemo(
    () => coverTemplates.map((template) => ({ value: template.id, label: template.id })),
    [coverTemplates]
  )

  const coverTemplateMap = useMemo(() => {
    return new Map<string, CoverTemplate>(coverTemplates.map((template) => [template.id, template]))
  }, [coverTemplates])

  const existingSlugSet = useMemo(() => {
    return new Set(blogs.map((blog) => blog.slug.trim().toLowerCase()))
  }, [blogs])

  const updateRow = useCallback((id: string, updater: (row: BulkRow) => BulkRow) => {
    setRows((prev) => prev.map((row) => (row.id === id ? updater(row) : row)))
  }, [])

  const handleAddRow = useCallback(() => {
    setRows((prev) => [...prev, createEmptyRow()])
  }, [])

  const handleDuplicateRow = useCallback((id: string) => {
    setRows((prev) => {
      const source = prev.find((row) => row.id === id)
      if (!source) return prev

      const nextTitle = source.title ? `${source.title} Copy` : ''
      const nextSlug = generateSlug(nextTitle)
      const duplicate = createEmptyRow({
        title: nextTitle,
        slug: nextSlug,
        slugManual: false,
        description: source.description,
        category: source.category,
        prompt: source.prompt,
        generateCover: source.generateCover,
        coverTemplateId: source.coverTemplateId,
        coverPath: source.coverPath
      })

      return [...prev, duplicate]
    })
  }, [])

  const handleRemoveRow = useCallback((id: string) => {
    setRows((prev) => {
      if (prev.length === 1) return prev
      return prev.filter((row) => row.id !== id)
    })

    setRowErrors((prev) => {
      const next = { ...prev }
      delete next[id]
      return next
    })
  }, [])

  const handleSelectCover = useCallback(
    async (rowId: string) => {
      const path = await window.api.selectImage()
      if (!path) return

      updateRow(rowId, (row) => ({
        ...resetRowRuntimeState(row),
        coverPath: path,
        generateCover: false
      }))
    },
    [updateRow]
  )

  const validate = useCallback((): boolean => {
    const nextGlobalErrors: Record<string, string> = {}
    const nextRowErrors: Record<string, RowErrors> = {}

    if (!author) nextGlobalErrors.author = 'Author is required'
    if (!date) nextGlobalErrors.date = 'Date is required'
    if (timeToRead < 1) nextGlobalErrors.timeToRead = 'Must be at least 1 minute'

    const seen = new Set<string>(existingSlugSet)

    for (const row of rows) {
      const errors: RowErrors = {}
      const title = row.title.trim()
      const slug = row.slug.trim()
      const description = row.description.trim()
      const category = row.category.trim()
      const coverTemplateId = row.coverTemplateId.trim()

      if (!title) errors.title = 'Title is required'

      if (!slug) {
        errors.slug = 'Slug is required'
      } else {
        const normalizedSlug = slug.toLowerCase()
        if (seen.has(normalizedSlug)) {
          errors.slug = 'Slug already exists in repo or this batch'
        } else {
          seen.add(normalizedSlug)
        }
      }

      if (!description) errors.description = 'Description is required'
      if (!category) errors.category = 'Category is required'

      if (row.generateCover) {
        if (coverTemplatesLoading && coverTemplates.length === 0) {
          errors.coverTemplateId = 'Cover templates are still loading'
        } else if (!coverTemplateId) {
          errors.coverTemplateId = 'Template is required when cover generation is enabled'
        } else if (!coverTemplateMap.has(coverTemplateId)) {
          errors.coverTemplateId = coverTemplatesError
            ? 'Cover templates are unavailable right now'
            : 'Selected cover template is unavailable'
        }
      }

      if (Object.keys(errors).length > 0) {
        nextRowErrors[row.id] = errors
      }
    }

    setGlobalErrors(nextGlobalErrors)
    setRowErrors(nextRowErrors)

    return Object.keys(nextGlobalErrors).length === 0 && Object.keys(nextRowErrors).length === 0
  }, [
    author,
    date,
    timeToRead,
    existingSlugSet,
    rows,
    coverTemplatesLoading,
    coverTemplates.length,
    coverTemplateMap,
    coverTemplatesError
  ])

  const handleRun = useCallback(async (): Promise<void> => {
    if (running) return
    setSummary(null)
    console.log('[bulk-generation] Starting bulk run')

    try {
      const claudeCheck = await window.api.checkClaude()
      console.log('[bulk-generation] Claude check result:', claudeCheck)
      if (!claudeCheck.installed) {
        toast.error('Claude Code is not installed. Open setup and install Claude to run AI generation.')
        return
      }
    } catch (err) {
      console.error('[bulk-generation] Claude check failed:', err)
      toast.error('Failed to verify Claude setup. Please check setup and try again.')
      return
    }

    if (!validate()) {
      toast.warning('Please resolve validation issues before running bulk generation.')
      console.warn('[bulk-generation] Validation failed, aborting run')
      return
    }

    const preparedRows = rows.map((row) => ({
      ...row,
      title: row.title.trim(),
      slug: row.slug.trim(),
      description: row.description.trim(),
      category: row.category.trim(),
      prompt: row.prompt.trim(),
      coverTemplateId: row.coverTemplateId.trim(),
      coverPath: row.coverPath.trim()
    }))

    setRunning(true)
    setRows((prev) => prev.map((row) => resetRowRuntimeState(row)))
    console.log(`[bulk-generation] Prepared ${preparedRows.length} rows for processing`)

    let created = 0
    let queued = 0
    let failed = 0

    for (const row of preparedRows) {
      console.log(`[bulk-generation] Creating row ${row.id} (${row.slug})`)
      setRows((prev) =>
        prev.map((entry) =>
          entry.id === row.id
            ? {
                ...resetRowRuntimeState(entry),
                status: 'creating',
                coverWarning: undefined
              }
            : entry
        )
      )

      const options: CreateBlogOptions = {
        title: row.title,
        slug: row.slug,
        description: row.description,
        date,
        timeToRead,
        author,
        category: row.category,
        featured,
        unlisted
      }

      let coverWarning: string | undefined
      let generatedCoverText: string | undefined
      let generatedCoverTempPath: string | undefined
      let generatedCoverUsed = false

      try {
        if (row.generateCover) {
          const selectedTemplate = coverTemplateMap.get(row.coverTemplateId)

          if (!selectedTemplate) {
            throw new Error('Selected cover template is unavailable.')
          }

          const generatedCoverResult = await window.api.prepareGeneratedCover({
            title: row.title,
            slug: row.slug,
            templateId: row.coverTemplateId,
            maxCharLimit: selectedTemplate.maxCharLimit
          })

          generatedCoverText = generatedCoverResult.coverText?.trim() || undefined

          if (generatedCoverResult.success && generatedCoverResult.tempPath) {
            generatedCoverTempPath = generatedCoverResult.tempPath
            generatedCoverUsed = true
            options.cover = generatedCoverTempPath
            console.log(`[bulk-generation] Generated cover for ${row.slug} using ${row.coverTemplateId}`)
          } else {
            coverWarning = appendWarning(
              coverWarning,
              `${generatedCoverResult.error || 'Cover generation failed.'} Creating the blog without a cover.`
            )
            console.warn(
              `[bulk-generation] Cover generation failed for ${row.slug}:`,
              generatedCoverResult.error
            )
          }
        } else if (row.coverPath) {
          options.cover = row.coverPath
        }

        const createResult = await window.api.createBlog(options)
        if (!createResult.success) {
          console.error(`[bulk-generation] Failed creating ${row.slug}:`, createResult.error)
          failed += 1
          setRows((prev) =>
            prev.map((entry) =>
              entry.id === row.id
                ? {
                    ...entry,
                    status: 'failed',
                    coverWarning,
                    generatedCoverText,
                    error: createResult.error || 'Failed to create blog post'
                  }
                : entry
            )
          )
          continue
        }

        created += 1
        console.log(`[bulk-generation] Created ${row.slug}`)
        requestGitStatusRefresh()
        requestCoverAuditRefresh()

        if (generatedCoverUsed) {
          const optimizeResult = await window.api.runOptimize()

          if (!optimizeResult.success) {
            coverWarning = appendWarning(
              coverWarning,
              'Cover was generated, but optimize failed. Check the console output for details.'
            )
            console.warn(
              `[bulk-generation] Optimize failed after generating ${row.slug}:`,
              optimizeResult.error || optimizeResult.output
            )
          } else {
            console.log(`[bulk-generation] Optimize finished after generating cover for ${row.slug}`)
            requestGitStatusRefresh()
            requestCoverAuditRefresh()
          }
        }

        console.log(`[bulk-generation] Queueing AI task for ${row.slug}`)

        const effectivePrompt = row.prompt || row.description
        if (!row.prompt) {
          console.log(`[bulk-generation] No custom prompt for ${row.slug}. Falling back to description.`)
        }

        const taskResult = await startTask(
          {
            blogSlug: row.slug,
            blogName: row.title,
            prompt: effectivePrompt
          },
          { toastMode: 'none' }
        )

        if (taskResult.started) {
          queued += 1
          console.log(`[bulk-generation] AI task queued for ${row.slug}`)
          setRows((prev) =>
            prev.map((entry) =>
              entry.id === row.id
                ? {
                    ...entry,
                    status: 'queued',
                    coverWarning,
                    generatedCoverText,
                    error: undefined
                  }
                : entry
            )
          )
        } else {
          console.warn(`[bulk-generation] AI task skipped for ${row.slug} (already queued/running)`)
          failed += 1
          setRows((prev) =>
            prev.map((entry) =>
              entry.id === row.id
                ? {
                    ...entry,
                    status: 'failed',
                    coverWarning,
                    generatedCoverText,
                    error: 'Blog created, but AI task was skipped (already queued/running).'
                  }
                : entry
            )
          )
        }
      } catch (err) {
        console.error(`[bulk-generation] Unexpected error for ${row.slug}:`, err)
        failed += 1
        setRows((prev) =>
          prev.map((entry) =>
            entry.id === row.id
              ? {
                  ...entry,
                  status: 'failed',
                  coverWarning,
                  generatedCoverText,
                  error: err instanceof Error ? err.message : 'Unexpected error while creating blog'
                }
              : entry
          )
        )
      } finally {
        if (generatedCoverTempPath) {
          const tempPathToCleanup = generatedCoverTempPath
          void window.api.cleanupGeneratedCoverTempFile(tempPathToCleanup).then((cleanupResult) => {
            if (!cleanupResult.success) {
              console.warn(
                `[bulk-generation] Failed cleaning up generated cover temp file for ${row.slug}:`,
                cleanupResult.error
              )
            }
          })
        }
      }
    }

    const nextSummary: BulkSummary = {
      attempted: preparedRows.length,
      created,
      queued,
      failed
    }

    setSummary(nextSummary)
    setRunning(false)
    console.log('[bulk-generation] Run complete:', nextSummary)

    if (queued > 0) {
      toast.success(`${created} blogs created. ${queued} AI task${queued === 1 ? '' : 's'} queued in launcher.`)
    }

    if (failed > 0) {
      toast.warning(`${failed} row${failed === 1 ? '' : 's'} failed. Check row statuses for details.`)
    }

    requestCoverAuditRefresh()
  }, [
    author,
    coverTemplateMap,
    date,
    featured,
    rows,
    running,
    startTask,
    timeToRead,
    toast,
    unlisted,
    validate
  ])

  if (loading) {
    return (
      <PageScaffold>
        <SurfaceCard className="flex min-h-[24rem] flex-col items-center justify-center">
          <Spinner size="lg" className="text-cyan" />
          <p className="mt-4 text-sm text-text-secondary">Loading bulk generation data...</p>
        </SurfaceCard>
      </PageScaffold>
    )
  }

  return (
    <PageScaffold wide>
      <div className="space-y-6 pb-6">
        <PageIntro
          eyebrow="Bulk Generation"
          title="Queue dozens of AI blog drafts in one pass."
          description="Set global defaults once, fill fast row-level metadata, and launch AI generation into the background queue without blocking your workflow."
          meta={
            <>
              <InfoPill>{rows.length} rows</InfoPill>
              <InfoPill>{blogs.length} existing blogs</InfoPill>
              <InfoPill>AI concurrency: 5</InfoPill>
            </>
          }
          actions={
            <Button
              variant="primary"
              icon={Sparkles}
              onClick={() => void handleRun()}
              loading={running}
              disabled={running}
            >
              {running ? 'Processing...' : 'Create & Queue AI'}
            </Button>
          }
        />

        <SurfaceCard className="relative z-30 space-y-5 p-6">
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-[0.18em] text-text-tertiary">Global defaults</p>
            <h2 className="font-display text-2xl text-text-primary">Applied to every row</h2>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            <FormField label="Author" required error={globalErrors.author}>
              <AuthorDropdown
                authors={authors}
                repoPath={repoPath}
                value={author}
                onChange={(authorSlug) => {
                  setAuthor(authorSlug)
                  if (globalErrors.author) {
                    setGlobalErrors((prev) => ({ ...prev, author: '' }))
                  }
                }}
                error={globalErrors.author}
                compact
              />
            </FormField>

            <FormField label="Date" required error={globalErrors.date}>
              <Input
                type="date"
                value={date}
                onChange={(e) => {
                  setDate(e.target.value)
                  if (globalErrors.date) {
                    setGlobalErrors((prev) => ({ ...prev, date: '' }))
                  }
                }}
                error={globalErrors.date}
              />
            </FormField>

            <FormField label="Time to read" error={globalErrors.timeToRead} helperText="In minutes">
              <Input
                type="number"
                value={String(timeToRead)}
                onChange={(e) => {
                  setTimeToRead(Number(e.target.value) || 0)
                  if (globalErrors.timeToRead) {
                    setGlobalErrors((prev) => ({ ...prev, timeToRead: '' }))
                  }
                }}
                min={1}
                error={globalErrors.timeToRead}
              />
            </FormField>

            <div className="space-y-2">
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-text-tertiary">Featured</p>
              <div className="flex min-h-[42px] items-center justify-between rounded-[12px] border border-white/10 bg-white/[0.03] px-3 py-2.5">
                <span className="text-sm text-text-primary">Highlight post</span>
                <Toggle checked={featured} onChange={setFeatured} />
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-text-tertiary">Unlisted</p>
              <div className="flex min-h-[42px] items-center justify-between rounded-[12px] border border-white/10 bg-white/[0.03] px-3 py-2.5">
                <span className="text-sm text-text-primary">Hide from listing</span>
                <Toggle checked={unlisted} onChange={setUnlisted} />
              </div>
            </div>
          </div>
        </SurfaceCard>

        <SurfaceCard className="relative z-10 space-y-5 p-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-text-tertiary">Rows</p>
              <h2 className="mt-1 font-display text-2xl text-text-primary">Blog inputs</h2>
            </div>
            <Button variant="secondary" icon={Plus} onClick={handleAddRow} disabled={running}>
              Add Row
            </Button>
          </div>

          {coverTemplatesError && (
            <div className="flex items-center justify-between gap-4 rounded-[14px] border border-warning/18 bg-warning-muted px-4 py-3">
              <p className="text-sm text-warning">
                Cover templates failed to load. Generated covers are blocked until templates are available.
              </p>
              <Button variant="secondary" size="sm" onClick={() => void refreshCoverTemplates()}>
                Retry templates
              </Button>
            </div>
          )}

          <div className="space-y-4">
            {rows.map((row, index) => {
              const errors = rowErrors[row.id]
              const hasErrors = !!errors && Object.values(errors).some(Boolean)
              const pill = getStatusPill(row.status, hasErrors)
              const selectedTemplate = coverTemplateMap.get(row.coverTemplateId)
              const showGeneratedCoverText =
                !!row.generatedCoverText && row.generatedCoverText.trim() !== row.title.trim()

              return (
                <div
                  key={row.id}
                  className={clsx(
                    'rounded-[16px] border p-4',
                    row.status === 'failed'
                      ? 'border-danger/24 bg-danger-muted/40'
                      : 'border-white/10 bg-white/[0.03]'
                  )}
                >
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-xs font-semibold text-text-secondary">
                        {index + 1}
                      </span>
                      <span
                        className={clsx(
                          'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium',
                          pill.className
                        )}
                      >
                        {pill.icon}
                        {pill.label}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        icon={Copy}
                        onClick={() => handleDuplicateRow(row.id)}
                        disabled={running}
                      >
                        Duplicate
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        icon={Trash2}
                        onClick={() => handleRemoveRow(row.id)}
                        disabled={running || rows.length === 1}
                      >
                        Remove
                      </Button>
                    </div>
                  </div>

                  <div className="grid gap-4 lg:grid-cols-3">
                    <FormField label="Title" required error={errors?.title}>
                      <Input
                        value={row.title}
                        onChange={(e) => {
                          const value = e.target.value
                          updateRow(row.id, (entry) => ({
                            ...resetRowRuntimeState(entry),
                            title: value,
                            slug: entry.slugManual ? entry.slug : generateSlug(value)
                          }))
                          if (errors?.title || errors?.slug) {
                            setRowErrors((prev) => ({
                              ...prev,
                              [row.id]: { ...prev[row.id], title: '', slug: '' }
                            }))
                          }
                        }}
                        placeholder="Blog title"
                        error={errors?.title}
                      />
                    </FormField>

                    <FormField label="Slug" required error={errors?.slug}>
                      <Input
                        value={row.slug}
                        onChange={(e) => {
                          const value = e.target.value
                          updateRow(row.id, (entry) => ({
                            ...resetRowRuntimeState(entry),
                            slugManual: true,
                            slug: value
                          }))
                          if (errors?.slug) {
                            setRowErrors((prev) => ({
                              ...prev,
                              [row.id]: { ...prev[row.id], slug: '' }
                            }))
                          }
                        }}
                        placeholder="blog-slug"
                        error={errors?.slug}
                      />
                    </FormField>

                    <FormField label="Category" required error={errors?.category}>
                      <Select
                        value={row.category}
                        onChange={(e) => {
                          updateRow(row.id, (entry) => ({
                            ...resetRowRuntimeState(entry),
                            category: e.target.value
                          }))
                          if (errors?.category) {
                            setRowErrors((prev) => ({
                              ...prev,
                              [row.id]: { ...prev[row.id], category: '' }
                            }))
                          }
                        }}
                        options={categoryOptions}
                        placeholder="Select category..."
                        error={errors?.category}
                      />
                    </FormField>
                  </div>

                  <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1fr)_19rem]">
                    <div className="space-y-4">
                      <FormField label="Description" required error={errors?.description}>
                        <textarea
                          value={row.description}
                          onChange={(e) => {
                            updateRow(row.id, (entry) => ({
                              ...resetRowRuntimeState(entry),
                              description: e.target.value
                            }))
                            if (errors?.description) {
                              setRowErrors((prev) => ({
                                ...prev,
                                [row.id]: { ...prev[row.id], description: '' }
                              }))
                            }
                          }}
                          placeholder="Short metadata description for this blog."
                          rows={3}
                          className={clsx(
                            'w-full rounded-[12px] border px-4 py-3 text-sm leading-7',
                            'bg-[linear-gradient(180deg,rgba(22,22,26,0.94),rgba(14,14,18,0.9))] text-text-primary placeholder:text-text-tertiary transition-all duration-200',
                            errors?.description
                              ? 'border-danger/45 focus:border-danger focus:shadow-[0_0_0_3px_rgba(255,140,140,0.12)]'
                              : 'border-white/10 hover:border-white/16 focus:border-white/18 focus:shadow-[0_0_0_3px_rgba(255,255,255,0.05)]',
                            'focus:outline-none'
                          )}
                        />
                      </FormField>

                      <FormField
                        label="AI Prompt"
                        helperText="Optional. If empty, bulk generation uses the description as prompt."
                      >
                        <textarea
                          value={row.prompt}
                          onChange={(e) => {
                            updateRow(row.id, (entry) => ({
                              ...resetRowRuntimeState(entry),
                              prompt: e.target.value
                            }))
                          }}
                          placeholder="Optional instructions for AI."
                          rows={5}
                          className={clsx(
                            'w-full rounded-[12px] border px-4 py-3 text-sm leading-7',
                            'bg-[linear-gradient(180deg,rgba(22,22,26,0.94),rgba(14,14,18,0.9))] text-text-primary placeholder:text-text-tertiary transition-all duration-200',
                            'border-white/10 hover:border-white/16 focus:border-white/18 focus:shadow-[0_0_0_3px_rgba(255,255,255,0.05)]',
                            'focus:outline-none'
                          )}
                        />
                      </FormField>
                    </div>

                    <div className="space-y-3">
                      <div className="rounded-[14px] border border-white/10 bg-white/[0.03] p-3">
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <p className="text-xs font-medium uppercase tracking-[0.18em] text-text-tertiary">
                              Cover image
                            </p>
                            <p className="mt-1 text-sm text-text-secondary">
                              Generate a PNG automatically or keep the manual upload flow.
                            </p>
                          </div>
                          <label className="inline-flex items-center gap-2.5 text-sm text-text-primary">
                            <input
                              type="checkbox"
                              checked={row.generateCover}
                              onChange={(e) => {
                                const checked = e.target.checked
                                updateRow(row.id, (entry) => ({
                                  ...resetRowRuntimeState(entry),
                                  generateCover: checked
                                }))
                                if (errors?.coverTemplateId) {
                                  setRowErrors((prev) => ({
                                    ...prev,
                                    [row.id]: { ...prev[row.id], coverTemplateId: '' }
                                  }))
                                }
                              }}
                              className="h-4 w-4 rounded border border-white/16 bg-[#111317] text-accent accent-accent"
                            />
                            <span>Generate</span>
                          </label>
                        </div>
                      </div>

                      {row.generateCover ? (
                        <>
                          <FormField
                            label="Template"
                            error={errors?.coverTemplateId}
                            helperText={
                              selectedTemplate
                                ? `Template: ${selectedTemplate.id}. Max ${selectedTemplate.maxCharLimit} characters before AI fallback.`
                                : coverTemplatesLoading
                                  ? 'Loading templates...'
                                  : coverTemplatesError
                                    ? 'Templates are unavailable right now.'
                                    : 'Choose a template for this blog cover.'
                            }
                          >
                            <Select
                              value={row.coverTemplateId}
                              onChange={(e) => {
                                updateRow(row.id, (entry) => ({
                                  ...resetRowRuntimeState(entry),
                                  coverTemplateId: e.target.value
                                }))
                                if (errors?.coverTemplateId) {
                                  setRowErrors((prev) => ({
                                    ...prev,
                                    [row.id]: { ...prev[row.id], coverTemplateId: '' }
                                  }))
                                }
                              }}
                              options={coverTemplateOptions}
                              disabled={coverTemplatesLoading || coverTemplateOptions.length === 0}
                              placeholder={coverTemplatesLoading ? 'Loading templates...' : 'Select template...'}
                              error={errors?.coverTemplateId}
                            />
                          </FormField>

                          <div className="rounded-[14px] border border-white/10 bg-white/[0.03] px-3.5 py-3 text-sm leading-6 text-text-secondary">
                            A cover will be generated during the run, attached to the blog, and optimized in the website repo.
                          </div>
                        </>
                      ) : row.coverPath ? (
                        <div className="overflow-hidden rounded-[14px] border border-white/10 bg-white/[0.03]">
                          <div className="relative">
                            <img
                              src={`file://${row.coverPath}`}
                              alt="Cover preview"
                              className="h-36 w-full object-cover"
                              onError={(e) => {
                                ;(e.target as HTMLImageElement).style.display = 'none'
                              }}
                            />
                            <button
                              type="button"
                              onClick={() =>
                                updateRow(row.id, (entry) => ({
                                  ...resetRowRuntimeState(entry),
                                  coverPath: ''
                                }))
                              }
                              className="absolute right-2 top-2 inline-flex h-7 w-7 items-center justify-center rounded-xl border border-white/10 bg-[#08111f]/90 text-text-secondary transition-colors hover:text-danger"
                              title="Remove cover"
                            >
                              <X size={13} />
                            </button>
                          </div>
                          <div className="truncate border-t border-white/8 px-3 py-2 text-xs text-text-tertiary">
                            {getPathFileName(row.coverPath)}
                          </div>
                        </div>
                      ) : (
                        <Button
                          variant="secondary"
                          icon={ImageIcon}
                          onClick={() => void handleSelectCover(row.id)}
                        >
                          Choose image
                        </Button>
                      )}
                    </div>
                  </div>

                  {row.coverWarning && (
                    <div className="mt-3 rounded-[12px] border border-warning/18 bg-warning-muted px-3.5 py-3">
                      <p className="text-sm text-warning">{row.coverWarning}</p>
                      {showGeneratedCoverText && (
                        <p className="mt-2 text-xs leading-6 text-text-secondary">
                          Cover text used: <span className="font-medium text-text-primary">{row.generatedCoverText}</span>
                        </p>
                      )}
                    </div>
                  )}

                  {!row.coverWarning && showGeneratedCoverText && (
                    <p className="mt-3 text-xs leading-6 text-text-tertiary">
                      Cover text used: <span className="font-medium text-text-primary">{row.generatedCoverText}</span>
                    </p>
                  )}

                  {row.error && <p className="mt-3 text-sm text-danger">{row.error}</p>}
                </div>
              )
            })}
          </div>

          <div className="flex items-center justify-between gap-3 pt-1">
            <Button variant="secondary" icon={Plus} onClick={handleAddRow} disabled={running}>
              Add Row
            </Button>
            <Button
              variant="primary"
              icon={Sparkles}
              onClick={() => void handleRun()}
              loading={running}
              disabled={running}
            >
              {running ? 'Processing...' : 'Create & Queue AI'}
            </Button>
          </div>
        </SurfaceCard>

        {summary && (
          <SurfaceCard className="p-5" highlight>
            <p className="text-xs uppercase tracking-[0.18em] text-text-tertiary">Run summary</p>
            <div className="mt-3 grid gap-3 sm:grid-cols-4">
              <div className="rounded-[12px] border border-white/10 bg-white/[0.03] px-3 py-2.5">
                <p className="text-xs text-text-tertiary">Attempted</p>
                <p className="mt-1 text-lg font-semibold text-text-primary">{summary.attempted}</p>
              </div>
              <div className="rounded-[12px] border border-cyan/20 bg-cyan-muted px-3 py-2.5">
                <p className="text-xs text-cyan">Created</p>
                <p className="mt-1 text-lg font-semibold text-cyan">{summary.created}</p>
              </div>
              <div className="rounded-[12px] border border-success/20 bg-success-muted px-3 py-2.5">
                <p className="text-xs text-success">AI queued</p>
                <p className="mt-1 text-lg font-semibold text-success">{summary.queued}</p>
              </div>
              <div className="rounded-[12px] border border-danger/20 bg-danger-muted px-3 py-2.5">
                <p className="text-xs text-danger">Failed</p>
                <p className="mt-1 text-lg font-semibold text-danger">{summary.failed}</p>
              </div>
            </div>
          </SurfaceCard>
        )}
      </div>
    </PageScaffold>
  )
}
