import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import clsx from 'clsx'
import {
  ArrowLeft,
  ChevronDown,
  Search,
  Image as ImageIcon,
  X,
  Check,
  Save,
  Sparkles
} from 'lucide-react'
import {
  MDXEditor,
  headingsPlugin,
  listsPlugin,
  quotePlugin,
  thematicBreakPlugin,
  markdownShortcutPlugin,
  toolbarPlugin,
  BoldItalicUnderlineToggles,
  StrikeThroughSupSubToggles,
  BlockTypeSelect,
  ListsToggle,
  CreateLink,
  InsertImage,
  InsertTable,
  InsertThematicBreak,
  InsertCodeBlock,
  CodeToggle,
  linkPlugin,
  linkDialogPlugin,
  imagePlugin,
  tablePlugin,
  codeBlockPlugin,
  codeMirrorPlugin,
  diffSourcePlugin,
  DiffSourceToggleWrapper,
  UndoRedo,
  Separator,
  ConditionalContents
} from '@mdxeditor/editor'
import type { MDXEditorMethods } from '@mdxeditor/editor'
import '@mdxeditor/editor/style.css'
import { useAuthors } from '../hooks/useAuthors'
import { useBlogs } from '../hooks/useBlogs'
import { useCategories } from '../hooks/useCategories'
import { useToast } from '../components/ui/Toast'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Select } from '../components/ui/Select'
import { Toggle } from '../components/ui/Toggle'
import { Spinner } from '../components/ui/Spinner'
import { AuthorAvatar } from '../components/shared/AuthorAvatar'
import { TerminalOutput } from '../components/shared/TerminalOutput'
import { WriteWithAIModal } from '../components/shared/WriteWithAIModal'
import { ClaudeSetupDialog } from '../components/shared/ClaudeSetupDialog'
import { ConfirmDialog } from '../components/shared/ConfirmDialog'
import { FormField } from '../components/forms/FormField'
import { InfoPill, PageIntro, PageScaffold, SurfaceCard } from '../components/layout/PageScaffold'
import { requestGitStatusRefresh } from '../hooks/gitStatusRefresh'
import type { Author, UpdateBlogOptions } from '../types'

/* ─── Author Dropdown with Avatars ─── */

interface AuthorDropdownProps {
  authors: Author[]
  repoPath: string
  value: string
  onChange: (slug: string) => void
  error?: string
}

function AuthorDropdown({
  authors,
  repoPath,
  value,
  onChange,
  error
}: AuthorDropdownProps): React.JSX.Element {
  const [isOpen, setIsOpen] = useState(false)
  const [search, setSearch] = useState('')
  const containerRef = useRef<HTMLDivElement>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)

  const selectedAuthor = authors.find((a) => a.slug === value)

  const filtered = useMemo(() => {
    if (!search.trim()) return authors
    const q = search.toLowerCase()
    return authors.filter(
      (a) =>
        a.name.toLowerCase().includes(q) || a.slug.toLowerCase().includes(q)
    )
  }, [authors, search])

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent): void => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false)
        setSearch('')
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // Focus search when opened
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      searchInputRef.current.focus()
    }
  }, [isOpen])

  const getAvatarSrc = (author: Author): string | undefined => {
    if (!author.avatar || !repoPath) return undefined
    return `file://${repoPath}/static${author.avatar}`
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => {
          setIsOpen(!isOpen)
          setSearch('')
        }}
        className={clsx(
          'flex w-full items-center gap-3 rounded-[12px] border px-4 py-2.5 text-left transition-all duration-200 cursor-pointer',
          'bg-[linear-gradient(180deg,rgba(23,23,27,0.94),rgba(15,15,18,0.88))]',
          error
            ? 'border-danger/45 focus:border-danger focus:shadow-[0_0_0_3px_rgba(255,140,140,0.12)]'
            : isOpen
              ? 'border-white/18 shadow-[0_0_0_3px_rgba(255,255,255,0.05)]'
              : 'border-white/10 hover:border-white/16',
          'focus:outline-none'
        )}
      >
        {selectedAuthor ? (
          <>
            <AuthorAvatar
              src={getAvatarSrc(selectedAuthor)}
              name={selectedAuthor.name}
              size="sm"
            />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-text-primary">{selectedAuthor.name}</p>
              <p className="mt-1 truncate text-xs text-text-tertiary">{selectedAuthor.role}</p>
            </div>
          </>
        ) : (
          <div className="flex-1">
            <p className="text-sm font-medium text-text-primary">Select an author</p>
            <p className="mt-1 text-xs text-text-tertiary">Search by name or slug</p>
          </div>
        )}
        <ChevronDown
          size={16}
          className={clsx(
            'shrink-0 text-text-tertiary transition-transform duration-200',
            isOpen && 'rotate-180'
          )}
        />
      </button>

      {isOpen && (
        <div
          className={clsx(
            'absolute z-30 top-full left-0 right-0 mt-2',
            'bg-[linear-gradient(180deg,rgba(26,26,30,0.98),rgba(12,12,14,0.98))] rounded-[18px] shadow-[0_24px_70px_rgba(3,7,18,0.38)]',
            'border border-white/10',
            'overflow-hidden',
            'animate-scale-in'
          )}
        >
          <div className="p-3 border-b border-white/8">
            <div className="relative">
              <Search
                size={14}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-text-tertiary"
              />
              <input
                ref={searchInputRef}
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search authors..."
                className={clsx(
                  'w-full pl-10 pr-4 py-2.5',
                  'text-sm bg-white/[0.04] rounded-[12px]',
                  'border border-white/10',
                  'focus:outline-none focus:border-white/18 focus:shadow-[0_0_0_3px_rgba(255,255,255,0.05)]',
                  'placeholder:text-text-tertiary',
                  'transition-all duration-150'
                )}
              />
            </div>
          </div>

          <div className="max-h-60 overflow-y-auto p-2">
            {filtered.length === 0 ? (
              <div className="px-3 py-6 text-center text-xs text-text-tertiary">
                No authors found
              </div>
            ) : (
              filtered.map((author) => {
                const isSelected = author.slug === value
                return (
                  <button
                    key={author.slug}
                    type="button"
                    onClick={() => {
                      onChange(author.slug)
                      setIsOpen(false)
                      setSearch('')
                    }}
                    className={clsx(
                      'w-full flex items-center gap-3 px-3 py-3 rounded-2xl',
                      'text-left text-sm cursor-pointer',
                      'transition-colors duration-100',
                      isSelected
                        ? 'bg-accent-muted text-accent'
                        : 'text-text-primary hover:bg-white/[0.05]'
                    )}
                  >
                    <AuthorAvatar
                      src={getAvatarSrc(author)}
                      name={author.name}
                      size="sm"
                    />
                    <div className="flex-1 min-w-0">
                      <span className="block truncate font-medium text-sm">{author.name}</span>
                      <span className="block truncate text-xs text-text-tertiary">{author.role}</span>
                    </div>
                    {isSelected && (
                      <Check size={14} className="shrink-0 text-accent" />
                    )}
                  </button>
                )
              })
            )}
          </div>
        </div>
      )}
    </div>
  )
}

/* ─── Frontmatter helpers ─── */

const FRONTMATTER_REGEX = /^---\n[\s\S]*?\n---\n?/
const URL_PROTOCOL_REGEX = /^[a-zA-Z][a-zA-Z0-9+.-]*:/

function stripFrontmatter(content: string): { frontmatter: string; body: string } {
  const match = content.match(FRONTMATTER_REGEX)
  if (match) {
    return {
      frontmatter: match[0],
      body: content.slice(match[0].length).trimStart()
    }
  }
  return { frontmatter: '', body: content }
}

function decodeURIComponentSafe(value: string): string {
  try {
    return decodeURIComponent(value)
  } catch {
    return value
  }
}

function joinRepoPath(basePath: string, rootRelativePath: string): string {
  const normalizedBase = basePath.replace(/[\\/]+$/, '')
  const normalizedPath = rootRelativePath.replace(/^\/+/, '')
  return `${normalizedBase}/${normalizedPath}`
}

function toFileUrl(absolutePath: string): string {
  const normalized = absolutePath.replace(/\\/g, '/')

  if (/^[a-zA-Z]:\//.test(normalized)) {
    return new URL(`file:///${normalized}`).toString()
  }

  const withLeadingSlash = normalized.startsWith('/') ? normalized : `/${normalized}`
  return new URL(`file://${withLeadingSlash}`).toString()
}

function canLoadImage(src: string): Promise<boolean> {
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => resolve(true)
    img.onerror = () => resolve(false)
    img.src = src
  })
}

/* ─── EditBlogPage ─── */

export default function EditBlogPage(): React.JSX.Element {
  const { slug } = useParams<{ slug: string }>()
  const navigate = useNavigate()
  const toast = useToast()

  // Load data
  const { authors, loading: authorsLoading } = useAuthors()
  const { blogs, loading: blogsLoading, refetch } = useBlogs()
  const { categories, loading: categoriesLoading } = useCategories()

  // Find the blog being edited
  const blog = useMemo(() => blogs.find((b) => b.slug === slug), [blogs, slug])

  // Form state - initialized from blog data
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [date, setDate] = useState('')
  const [timeToRead, setTimeToRead] = useState(5)
  const [author, setAuthor] = useState('')
  const [category, setCategory] = useState('')
  const [featured, setFeatured] = useState(false)
  const [unlisted, setUnlisted] = useState(false)
  const [coverPath, setCoverPath] = useState('')

  // Markdoc content
  const [markdocContent, setMarkdocContent] = useState('')
  const [contentLoading, setContentLoading] = useState(true)
  const editorRef = useRef<MDXEditorMethods>(null)
  const frontmatterRef = useRef<string>('')

  // Submission state
  const [submitting, setSubmitting] = useState(false)
  const [cliOutput, setCliOutput] = useState<string[]>([])
  const [submitResult, setSubmitResult] = useState<'success' | 'error' | null>(null)

  // AI modal state
  const [aiModalOpen, setAiModalOpen] = useState(false)
  const [aiGenerating, setAiGenerating] = useState(false)
  const [, setAiOutput] = useState<string[]>([])
  const [aiResult, setAiResult] = useState<'success' | 'error' | null>(null)

  // Claude setup dialog state
  const [setupDialogOpen, setSetupDialogOpen] = useState(false)
  const [setupReason, setSetupReason] = useState<'not-installed' | 'not-logged-in'>('not-installed')
  const lastAiPromptRef = useRef<string>('')

  // Unsaved changes tracking
  const [originalContent, setOriginalContent] = useState('')
  const [, setIsDirty] = useState(false)
  const [confirmAIOpen, setConfirmAIOpen] = useState(false)
  const editorInitializedRef = useRef(false)

  // Validation
  const [errors, setErrors] = useState<Record<string, string>>({})

  // Repo path for avatar images
  const [repoPath, setRepoPath] = useState('')
  const imagePreviewCacheRef = useRef<Map<string, string>>(new Map())

  useEffect(() => {
    window.api.getRepoPath().then(setRepoPath).catch(() => {})
  }, [])

  useEffect(() => {
    imagePreviewCacheRef.current.clear()
  }, [repoPath, slug])

  const resolveEditorImageSource = useCallback(
    async (imageSource: string): Promise<string> => {
      const cached = imagePreviewCacheRef.current.get(imageSource)
      if (cached !== undefined) return cached

      if (!repoPath) return imageSource

      const source = imageSource.trim()
      if (!source || URL_PROTOCOL_REGEX.test(source) || source.startsWith('//')) {
        imagePreviewCacheRef.current.set(imageSource, imageSource)
        return imageSource
      }

      const match = source.match(/^([^?#]+)([?#].*)?$/)
      const rawPath = match?.[1] ?? source
      const suffix = match?.[2] ?? ''

      if (!rawPath.startsWith('/')) {
        imagePreviewCacheRef.current.set(imageSource, imageSource)
        return imageSource
      }

      const decodedPath = decodeURIComponentSafe(rawPath)
      const candidates: string[] = []

      // Keep parity with avatar loading (repo/static/*), then fall back to repo root.
      if (!decodedPath.startsWith('/static/')) {
        candidates.push(`${toFileUrl(joinRepoPath(repoPath, `/static${decodedPath}`))}${suffix}`)
      }
      candidates.push(`${toFileUrl(joinRepoPath(repoPath, decodedPath))}${suffix}`)

      for (const candidate of candidates) {
        if (await canLoadImage(candidate)) {
          imagePreviewCacheRef.current.set(imageSource, candidate)
          return candidate
        }
      }

      imagePreviewCacheRef.current.set(imageSource, imageSource)
      return imageSource
    },
    [repoPath]
  )

  // Initialize form when blog loads
  useEffect(() => {
    if (blog) {
      setTitle(blog.title)
      setDescription(blog.description)
      setDate(blog.date)
      setTimeToRead(blog.timeToRead)
      setAuthor(blog.author)
      setCategory(blog.category)
      setFeatured(blog.featured)
      setUnlisted(blog.unlisted)
      setCoverPath(blog.cover || '')
    }
  }, [blog])

  // Load markdoc content
  useEffect(() => {
    if (slug) {
      setContentLoading(true)
      editorInitializedRef.current = false
      window.api.readBlogContent(slug).then((result) => {
        if (result.success && result.content) {
          const { frontmatter, body } = stripFrontmatter(result.content)
          frontmatterRef.current = frontmatter
          setMarkdocContent(body)
          setIsDirty(false)
        }
        setContentLoading(false)
      })
    }
  }, [slug])

  // Category options for Select component
  const categoryOptions = useMemo(
    () => categories.map((c) => ({ value: c.slug, label: c.name })),
    [categories]
  )

  const loading = authorsLoading || blogsLoading || categoriesLoading

  /* ─── Validation ─── */
  const validate = useCallback((): boolean => {
    const errs: Record<string, string> = {}
    if (!title.trim()) errs.title = 'Title is required'
    if (!description.trim()) errs.description = 'Description is required'
    if (!date) errs.date = 'Date is required'
    if (!author) errs.author = 'Author is required'
    if (!category) errs.category = 'Category is required'
    if (timeToRead < 1) errs.timeToRead = 'Must be at least 1 minute'
    setErrors(errs)
    return Object.keys(errs).length === 0
  }, [title, description, date, author, category, timeToRead])

  /* ─── Save ─── */
  const handleSave = async (): Promise<void> => {
    if (!validate()) return

    setSubmitting(true)
    setCliOutput([])
    setSubmitResult(null)

    try {
      window.api.onCliOutput((data: string) => {
        setCliOutput((prev) => [...prev, data])
      })

      // 1. Write markdoc content
      const editorBody = editorRef.current?.getMarkdown() ?? markdocContent
      const currentContent = frontmatterRef.current + editorBody
      const writeResult = await window.api.writeBlogContent(slug!, currentContent)
      if (!writeResult.success) {
        throw new Error(writeResult.error ?? 'Failed to write blog content')
      }

      // 2. Update metadata
      const options: UpdateBlogOptions = {
        title: title.trim(),
        slug: slug!,
        description: description.trim(),
        date,
        timeToRead,
        author,
        category,
        featured,
        unlisted
      }
      if (coverPath) options.cover = coverPath

      const updateResult = await window.api.updateBlog(options)
      if (!updateResult.success) {
        throw new Error(updateResult.error ?? 'Failed to update blog metadata')
      }

      // 3. Run sanitize
      const sanitizeResult = await window.api.sanitize(slug!)

      window.api.removeCliOutputListener()

      if (sanitizeResult.success) {
        // After successful save, update the baseline so dirty detection
        // reflects that the editor content now matches what's on disk.
        setOriginalContent(currentContent)
        setIsDirty(false)
        requestGitStatusRefresh()
        setSubmitResult('success')
        toast.success('Blog post updated successfully!')
      } else {
        setSubmitResult('error')
        toast.error(sanitizeResult.error ?? 'Sanitize failed')
      }
    } catch (err) {
      window.api.removeCliOutputListener()
      setSubmitResult('error')
      toast.error(err instanceof Error ? err.message : 'An unexpected error occurred')
    } finally {
      setSubmitting(false)
    }
  }

  /* ─── Dirty check helper ─── */
  const checkIfDirty = useCallback((): boolean => {
    const editorBody = editorRef.current?.getMarkdown() ?? markdocContent
    const currentContent = frontmatterRef.current + editorBody
    return currentContent !== originalContent
  }, [markdocContent, originalContent])

  /* ─── Write with AI ─── */
  const handleWriteWithAI = useCallback(async (): Promise<void> => {
    console.log('[handleWriteWithAI] Button clicked — checking Claude installation...')
    // Check if Claude Code CLI is installed before proceeding
    try {
      const claudeCheck = await window.api.checkClaude()
      console.log('[handleWriteWithAI] Claude check result:', claudeCheck)
      if (!claudeCheck.installed) {
        setSetupReason('not-installed')
        setSetupDialogOpen(true)
        return
      }
    } catch {
      // If the check itself fails, show the install dialog
      setSetupReason('not-installed')
      setSetupDialogOpen(true)
      return
    }

    if (checkIfDirty()) {
      setConfirmAIOpen(true)
    } else {
      setAiModalOpen(true)
      setAiOutput([])
      setAiResult(null)
    }
  }, [checkIfDirty])

  const handleConfirmAI = useCallback((): void => {
    setConfirmAIOpen(false)
    setAiModalOpen(true)
    setAiOutput([])
    setAiResult(null)
  }, [])

  // Helper to detect authentication errors in CLI output
  const isAuthError = useCallback((text: string): boolean => {
    const lower = text.toLowerCase()
    return (
      lower.includes('not logged in') ||
      lower.includes('not authenticated') ||
      lower.includes('authentication required') ||
      lower.includes('please log in') ||
      lower.includes('login required')
    )
  }, [])

  const handleAIGenerate = useCallback(
    async (prompt: string): Promise<void> => {
      if (!slug) {
        console.warn('[handleAIGenerate] No slug, aborting')
        return
      }

      console.log('[handleAIGenerate] Starting AI generation for slug:', slug)
      console.log('[handleAIGenerate] Prompt length:', prompt.length)

      // Store the prompt so we can retry after login
      lastAiPromptRef.current = prompt

      setAiGenerating(true)
      setAiOutput([])
      setAiResult(null)

      // Remove any stale listeners first, then attach new ones
      window.api.removeCliOutputListener()
      window.api.onCliOutput((data: string) => {
        console.log('[handleAIGenerate] CLI output received:', data.length, 'bytes')
        setAiOutput((prev) => [...prev, data])
      })

      try {
        console.log('[handleAIGenerate] Calling window.api.writeWithAI...')
        const result = await window.api.writeWithAI(slug, prompt)
        console.log('[handleAIGenerate] writeWithAI resolved:', result.success, result.error ?? '')
        window.api.removeCliOutputListener()

        if (result.success) {
          // Reload blog content from disk
          const reloadResult = await window.api.readBlogContent(slug)
          if (reloadResult.success && reloadResult.content) {
            const { frontmatter, body } = stripFrontmatter(reloadResult.content)
            frontmatterRef.current = frontmatter
            setMarkdocContent(body)
            // Reset so the next editor onChange captures the new normalized baseline
            editorInitializedRef.current = false
            editorRef.current?.setMarkdown(body)
            setIsDirty(false)
          }
          refetch()
          setAiResult('success')
        } else {
          // Check if the error is an authentication issue
          const errorText = [result.error ?? '', result.output ?? ''].join(' ')
          if (isAuthError(errorText)) {
            setSetupReason('not-logged-in')
            setSetupDialogOpen(true)
            // Don't show error in the modal — the setup dialog handles it
            setAiResult(null)
          } else {
            setAiResult('error')
          }
        }
      } catch (err) {
        console.error('[handleAIGenerate] Caught error:', err)
        window.api.removeCliOutputListener()
        setAiResult('error')
      } finally {
        console.log('[handleAIGenerate] Finally block — setting aiGenerating to false')
        setAiGenerating(false)
      }
    },
    [slug, refetch, isAuthError]
  )

  /* ─── Setup dialog completion ─── */
  const handleSetupComplete = useCallback((): void => {
    setSetupDialogOpen(false)

    if (setupReason === 'not-logged-in' && lastAiPromptRef.current) {
      // Automatically retry AI generation with the same prompt
      // The AI modal is still open, so just re-trigger generation
      handleAIGenerate(lastAiPromptRef.current)
    }
    // If reason was 'not-installed', the user can manually click "Write with AI" again
  }, [setupReason, handleAIGenerate])

  /* ─── Cover image picker ─── */
  const handleSelectCover = async (): Promise<void> => {
    const path = await window.api.selectImage()
    if (path) setCoverPath(path)
  }

  /* ─── Loading state ─── */
  if (loading) {
    return (
      <PageScaffold>
        <SurfaceCard className="flex min-h-[24rem] flex-col items-center justify-center">
          <Spinner size="lg" className="text-cyan" />
          <p className="mt-4 text-sm text-text-secondary">Loading blog data...</p>
        </SurfaceCard>
      </PageScaffold>
    )
  }

  /* ─── Blog not found ─── */
  if (!blogsLoading && !blog) {
    return (
      <PageScaffold>
        <div className="space-y-8">
          <Button variant="ghost" size="md" icon={ArrowLeft} onClick={() => navigate('/dashboard/blogs')}>
            Back to Blog Posts
          </Button>
          <SurfaceCard className="max-w-3xl px-8 py-10 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-[16px] border border-danger/20 bg-danger-muted text-danger">
              <X size={30} strokeWidth={1.9} />
            </div>
            <h2 className="mt-5 font-display text-4xl text-text-primary">Blog post not found</h2>
            <p className="mt-3 text-sm leading-7 text-text-secondary">
              No blog post with slug &ldquo;{slug}&rdquo; could be found.
            </p>
          </SurfaceCard>
        </div>
      </PageScaffold>
    )
  }

  /* ─── Success state ─── */
  if (submitResult === 'success') {
    return (
      <PageScaffold>
        <div className="space-y-8">
          <Button variant="ghost" size="md" icon={ArrowLeft} onClick={() => navigate('/dashboard/blogs')}>
            Back to Blog Posts
          </Button>
          <SurfaceCard className="max-w-3xl px-8 py-10 text-center" highlight>
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-[16px] border border-success/20 bg-success-muted text-success">
              <Check size={30} strokeWidth={1.9} />
            </div>
            <h2 className="mt-5 font-display text-4xl text-text-primary">Blog post updated</h2>
            <p className="mt-3 text-sm leading-7 text-text-secondary">
              &ldquo;{title}&rdquo; has been saved successfully.
            </p>
            {cliOutput.length > 0 && <div className="mt-8"><TerminalOutput lines={cliOutput} title="Save Output" /></div>}
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <Button
                variant="primary"
                icon={Save}
                onClick={() => {
                  setSubmitResult(null)
                  setCliOutput([])
                }}
              >
                Continue Editing
              </Button>
              <Button variant="secondary" icon={ArrowLeft} onClick={() => navigate('/dashboard/blogs')}>
                Back to Blogs
              </Button>
            </div>
          </SurfaceCard>
        </div>
      </PageScaffold>
    )
  }

  return (
    <PageScaffold wide>
      <div className="space-y-8">
        <Button variant="ghost" size="md" icon={ArrowLeft} onClick={() => navigate('/dashboard/blogs')}>
          Back to Blog Posts
        </Button>

        <PageIntro
          eyebrow="Edit Story"
          title="Refine the draft, then ship it clean."
          description="Update metadata, work directly in the markdown editor, and optionally use AI generation once the post is in a good baseline state."
          meta={<InfoPill>{slug}</InfoPill>}
          actions={
            <Button variant="primary" size="md" icon={Sparkles} onClick={handleWriteWithAI} disabled={submitting || contentLoading}>
              Write with AI
            </Button>
          }
        />

        <SurfaceCard className="max-w-5xl space-y-6 p-6 sm:p-8" highlight>
        {/* Title */}
        <FormField label="Title" required error={errors.title}>
          <Input
            value={title}
            onChange={(e) => {
              setTitle(e.target.value)
              if (errors.title) setErrors((prev) => ({ ...prev, title: '' }))
            }}
            placeholder="e.g., Introducing Appwrite Functions 2.0"
            error={errors.title}
          />
        </FormField>

        {/* Slug (read-only) */}
        <FormField label="Slug" helperText="The slug cannot be changed after creation.">
          <div
            className={clsx(
              'w-full rounded-[12px] border border-white/10 px-4 py-2.5 text-sm',
              'bg-[linear-gradient(180deg,rgba(22,22,26,0.94),rgba(14,14,18,0.9))]',
              'text-text-tertiary font-mono',
              'select-all cursor-default'
            )}
          >
            {slug}
          </div>
        </FormField>

        {/* Description */}
        <FormField label="Description" required error={errors.description}>
          <textarea
            value={description}
            onChange={(e) => {
              setDescription(e.target.value)
              if (errors.description) setErrors((prev) => ({ ...prev, description: '' }))
            }}
            placeholder="A brief summary of the blog post..."
            rows={3}
            className={clsx(
              'min-h-[110px] w-full resize-y rounded-[12px] border px-4 py-3 text-sm leading-7',
              'bg-[linear-gradient(180deg,rgba(22,22,26,0.94),rgba(14,14,18,0.9))] text-text-primary font-sans',
              'transition-all duration-200',
              'placeholder:text-text-tertiary',
              errors.description
                ? 'border-danger/45 focus:border-danger focus:shadow-[0_0_0_3px_rgba(255,140,140,0.12)]'
                : 'border-white/10 hover:border-white/16 focus:border-white/18 focus:shadow-[0_0_0_3px_rgba(255,255,255,0.05)]',
              'focus:outline-none'
            )}
          />
        </FormField>

        {/* Date + Time to Read (side by side) */}
        <div className="grid grid-cols-2 gap-4">
          <FormField label="Date" required error={errors.date}>
            <Input
              type="date"
              value={date}
              onChange={(e) => {
                setDate(e.target.value)
                if (errors.date) setErrors((prev) => ({ ...prev, date: '' }))
              }}
              error={errors.date}
            />
          </FormField>

          <FormField
            label="Time to Read"
            error={errors.timeToRead}
            helperText="In minutes"
          >
            <Input
              type="number"
              value={String(timeToRead)}
              onChange={(e) => {
                setTimeToRead(Number(e.target.value) || 0)
                if (errors.timeToRead) setErrors((prev) => ({ ...prev, timeToRead: '' }))
              }}
              min={1}
              error={errors.timeToRead}
            />
          </FormField>
        </div>

        {/* Author (custom dropdown) */}
        <FormField label="Author" required error={errors.author}>
          <AuthorDropdown
            authors={authors}
            repoPath={repoPath}
            value={author}
            onChange={(authorSlug) => {
              setAuthor(authorSlug)
              if (errors.author) setErrors((prev) => ({ ...prev, author: '' }))
            }}
            error={errors.author}
          />
        </FormField>

        {/* Category */}
        <FormField label="Category" required error={errors.category}>
          <Select
            options={categoryOptions}
            value={category}
            onChange={(e) => {
              setCategory(e.target.value)
              if (errors.category) setErrors((prev) => ({ ...prev, category: '' }))
            }}
            placeholder="Select a category..."
            error={errors.category}
          />
        </FormField>

        <div className="flex items-center justify-between rounded-[14px] border border-white/8 bg-white/[0.03] px-4 py-3.5">
          <div>
            <p className="text-sm font-medium text-text-primary">Featured Post</p>
            <p className="text-xs text-text-tertiary mt-0.5">
              Featured posts appear prominently on the homepage
            </p>
          </div>
          <Toggle checked={featured} onChange={setFeatured} />
        </div>

        <div className="flex items-center justify-between rounded-[14px] border border-white/8 bg-white/[0.03] px-4 py-3.5">
          <div>
            <p className="text-sm font-medium text-text-primary">Unlisted</p>
            <p className="text-xs text-text-tertiary mt-0.5">
              Hidden from blog listing (for SEO blogs)
            </p>
          </div>
          <Toggle checked={unlisted} onChange={setUnlisted} />
        </div>

        <div className="elevated-divider" />

        {/* Cover Image */}
        <FormField label="Cover Image" helperText="Optional. Select a cover image for the blog post.">
          {coverPath ? (
            <div className="relative overflow-hidden rounded-[18px] border border-white/10 bg-white/[0.03]">
              <img
                src={`file://${coverPath}`}
                alt="Cover preview"
                className="h-52 w-full object-cover"
                onError={(e) => {
                  ;(e.target as HTMLImageElement).style.display = 'none'
                }}
              />
              <div className="absolute top-2 right-2 flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setCoverPath('')}
                  className={clsx(
                    'p-2 rounded-2xl',
                    'bg-[#08111f]/90 backdrop-blur-sm',
                    'text-text-secondary hover:text-danger',
                    'border border-white/10',
                    'transition-colors duration-150 cursor-pointer'
                  )}
                  title="Remove cover image"
                >
                  <X size={14} />
                </button>
              </div>
              <div className="truncate border-t border-white/8 px-4 py-3 text-xs text-text-tertiary">
                {coverPath.split('/').pop()}
              </div>
            </div>
          ) : (
            <Button
              variant="secondary"
              icon={ImageIcon}
              onClick={handleSelectCover}
            >
              Choose Image
            </Button>
          )}
        </FormField>

        <div className="elevated-divider" />

        <div>
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-text-tertiary">Content</p>
          <h2 className="mt-2 font-display text-3xl text-text-primary">Editor</h2>
          <p className="mt-2 mb-4 text-sm leading-7 text-text-secondary">
            Edit the blog post content below. Use the toolbar to format text, or switch to source mode for raw markdown.
          </p>
          {contentLoading ? (
            <div className="flex items-center justify-center rounded-[18px] border border-white/10 bg-[linear-gradient(180deg,rgba(24,24,28,0.94),rgba(15,15,18,0.9))] py-12">
              <Spinner size="md" className="text-cyan" />
              <span className="ml-3 text-sm text-text-secondary">Loading content...</span>
            </div>
          ) : (
            <div className="mdxeditor-wrapper overflow-hidden rounded-[18px] border border-white/10 [&_.mdxeditor]:bg-transparent [&_.mdxeditor-toolbar]:bg-transparent [&_.mdxeditor-toolbar]:border-b [&_.mdxeditor-toolbar]:border-border-primary [&_.mdxeditor-root-contenteditable]:min-h-[400px] [&_.mdxeditor-root-contenteditable]:px-4 [&_.mdxeditor-root-contenteditable]:py-3 [&_h1]:text-2xl [&_h1]:font-bold [&_h1]:mt-6 [&_h1]:mb-3 [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:mt-5 [&_h2]:mb-2 [&_h3]:text-lg [&_h3]:font-semibold [&_h3]:mt-4 [&_h3]:mb-2 [&_h4]:text-base [&_h4]:font-medium [&_h4]:mt-3 [&_h4]:mb-1 [&_p]:leading-relaxed [&_p]:mb-3 [&_img]:rounded-lg [&_img]:my-4 [&_img]:max-w-full [&_blockquote]:border-l-4 [&_blockquote]:border-accent [&_blockquote]:pl-4 [&_blockquote]:italic [&_blockquote]:text-text-secondary [&_code]:bg-bg-secondary [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded [&_code]:text-sm [&_code]:font-mono [&_pre]:bg-bg-secondary [&_pre]:rounded-lg [&_pre]:p-4 [&_pre]:overflow-x-auto [&_table]:w-full [&_table]:border-collapse [&_th]:bg-bg-secondary [&_th]:border [&_th]:border-border-primary [&_th]:px-3 [&_th]:py-2 [&_th]:text-left [&_th]:font-semibold [&_td]:border [&_td]:border-border-primary [&_td]:px-3 [&_td]:py-2 [&_hr]:border-border-primary [&_hr]:my-6 [&_a]:text-accent [&_a]:underline [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:mb-3 [&_ol]:list-decimal [&_ol]:pl-6 [&_ol]:mb-3 [&_li]:mb-1">
              <MDXEditor
                ref={editorRef}
                markdown={markdocContent}
                onChange={(md) => {
                  const currentContent = frontmatterRef.current + md
                  if (!editorInitializedRef.current) {
                    // First onChange fires when MDXEditor normalizes the initial markdown.
                    // Capture this as the baseline so we only detect real user edits.
                    editorInitializedRef.current = true
                    setOriginalContent(currentContent)
                    setIsDirty(false)
                    return
                  }
                  setIsDirty(currentContent !== originalContent)
                }}
                plugins={[
                  headingsPlugin({ allowedHeadingLevels: [1, 2, 3, 4, 5, 6] }),
                  listsPlugin(),
                  quotePlugin(),
                  thematicBreakPlugin(),
                  linkPlugin(),
                  linkDialogPlugin(),
                  imagePlugin({
                    disableImageResize: true,
                    imagePreviewHandler: resolveEditorImageSource
                  }),
                  tablePlugin(),
                  codeBlockPlugin({ defaultCodeBlockLanguage: 'javascript' }),
                  codeMirrorPlugin({
                    codeBlockLanguages: {
                      js: 'JavaScript',
                      javascript: 'JavaScript',
                      ts: 'TypeScript',
                      typescript: 'TypeScript',
                      tsx: 'TSX',
                      jsx: 'JSX',
                      css: 'CSS',
                      html: 'HTML',
                      json: 'JSON',
                      python: 'Python',
                      bash: 'Bash',
                      sh: 'Shell',
                      go: 'Go',
                      rust: 'Rust',
                      sql: 'SQL',
                      yaml: 'YAML',
                      xml: 'XML',
                      diff: 'Diff',
                      markdown: 'Markdown',
                      '': 'Plain Text'
                    }
                  }),
                  diffSourcePlugin({ viewMode: 'rich-text' }),
                  markdownShortcutPlugin(),
                  toolbarPlugin({
                    toolbarContents: () => (
                      <DiffSourceToggleWrapper options={['rich-text', 'source']}>
                        <ConditionalContents
                          options={[
                            {
                              fallback: () => (
                                <>
                                  <UndoRedo />
                                  <Separator />
                                  <BoldItalicUnderlineToggles />
                                  <CodeToggle />
                                  <Separator />
                                  <StrikeThroughSupSubToggles />
                                  <Separator />
                                  <BlockTypeSelect />
                                  <Separator />
                                  <ListsToggle />
                                  <Separator />
                                  <CreateLink />
                                  <InsertImage />
                                  <Separator />
                                  <InsertTable />
                                  <InsertThematicBreak />
                                  <InsertCodeBlock />
                                </>
                              )
                            }
                          ]}
                        />
                      </DiffSourceToggleWrapper>
                    )
                  })
                ]}
              />
            </div>
          )}
        </div>

        {/* CLI Output (visible during/after submission) */}
        {cliOutput.length > 0 && (
          <TerminalOutput lines={cliOutput} title="CLI Output" />
        )}

        {/* Error state after submission */}
        {submitResult === 'error' && (
          <div className="rounded-[16px] border border-danger/20 bg-danger-muted p-4">
            <p className="text-sm text-danger font-medium">Failed to update blog post</p>
            <p className="mt-1 text-sm leading-7 text-text-secondary">
              Check the CLI output above for details, or try again.
            </p>
          </div>
        )}

        <div className="flex items-center gap-3 pt-2 pb-4">
          <Button
            variant="primary"
            size="lg"
            loading={submitting}
            onClick={handleSave}
            disabled={submitting}
            icon={Save}
          >
            Save Changes
          </Button>
          <Button
            variant="ghost"
            size="lg"
            onClick={() => navigate('/dashboard/blogs')}
            disabled={submitting}
          >
            Cancel
          </Button>
        </div>
        </SurfaceCard>

      <ConfirmDialog
        open={confirmAIOpen}
        onClose={() => setConfirmAIOpen(false)}
        onConfirm={handleConfirmAI}
        title="Unsaved Changes"
        message="You have unsaved changes. AI generation will overwrite your current work. Continue?"
        confirmLabel="Continue"
        variant="danger"
      />

      <WriteWithAIModal
        open={aiModalOpen}
        onClose={() => {
          if (!aiGenerating) {
            setAiModalOpen(false)
          }
        }}
        onGenerate={handleAIGenerate}
        blogSlug={slug!}
        generating={aiGenerating}
        result={aiResult}
      />

      <ClaudeSetupDialog
        open={setupDialogOpen}
        onClose={() => setSetupDialogOpen(false)}
        onComplete={handleSetupComplete}
        reason={setupReason}
      />
      </div>
    </PageScaffold>
  )
}
