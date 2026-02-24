import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import clsx from 'clsx'
import {
  ArrowLeft,
  ChevronDown,
  Search,
  Image as ImageIcon,
  FileArchive,
  X,
  Check,
  FilePlus,
  List
} from 'lucide-react'
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
import { FileDropZone } from '../components/shared/FileDropZone'
import { FormField } from '../components/forms/FormField'
import type { Author, CreateBlogOptions } from '../types'

/* ─── Slug generation ─── */

function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
}

/* ─── Today's date as YYYY-MM-DD ─── */

function todayString(): string {
  const d = new Date()
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

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
      {/* Trigger button */}
      <button
        type="button"
        onClick={() => {
          setIsOpen(!isOpen)
          setSearch('')
        }}
        className={clsx(
          'w-full flex items-center gap-2.5 px-3 py-2',
          'bg-bg-elevated rounded-md text-sm text-left',
          'border transition-all duration-200 cursor-pointer',
          error
            ? 'border-danger focus:border-danger focus:shadow-[0_0_0_3px_rgba(217,48,54,0.1)]'
            : isOpen
              ? 'border-accent shadow-[0_0_0_3px_var(--color-accent-muted)]'
              : 'border-border-primary hover:border-border-secondary',
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
            <span className="flex-1 text-text-primary truncate">{selectedAuthor.name}</span>
          </>
        ) : (
          <span className="flex-1 text-text-tertiary">Select an author...</span>
        )}
        <ChevronDown
          size={16}
          className={clsx(
            'shrink-0 text-text-tertiary transition-transform duration-200',
            isOpen && 'rotate-180'
          )}
        />
      </button>

      {/* Dropdown panel */}
      {isOpen && (
        <div
          className={clsx(
            'absolute z-30 top-full left-0 right-0 mt-1',
            'bg-bg-elevated rounded-lg shadow-lg',
            'border border-border-primary',
            'overflow-hidden',
            'animate-scale-in'
          )}
        >
          {/* Search within dropdown */}
          <div className="p-2 border-b border-border-primary">
            <div className="relative">
              <Search
                size={14}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-tertiary"
              />
              <input
                ref={searchInputRef}
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search authors..."
                className={clsx(
                  'w-full pl-8 pr-3 py-1.5',
                  'text-xs bg-bg-secondary rounded-md',
                  'border border-border-primary',
                  'focus:outline-none focus:border-accent',
                  'placeholder:text-text-tertiary',
                  'transition-all duration-150'
                )}
              />
            </div>
          </div>

          {/* Options list */}
          <div className="max-h-52 overflow-y-auto py-1">
            {filtered.length === 0 ? (
              <div className="px-3 py-4 text-center text-xs text-text-tertiary">
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
                      'w-full flex items-center gap-2.5 px-3 py-2',
                      'text-left text-sm cursor-pointer',
                      'transition-colors duration-100',
                      isSelected
                        ? 'bg-accent-muted text-accent'
                        : 'text-text-primary hover:bg-bg-hover'
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

/* ─── CreateBlogPage ─── */

export default function CreateBlogPage(): React.JSX.Element {
  const navigate = useNavigate()
  const toast = useToast()
  const { authors, loading: authorsLoading } = useAuthors()
  const { blogs: existingBlogs, loading: blogsLoading } = useBlogs()
  const { categories, loading: categoriesLoading } = useCategories()

  // Form state
  const [title, setTitle] = useState('')
  const [slug, setSlug] = useState('')
  const [slugManual, setSlugManual] = useState(false)
  const [description, setDescription] = useState('')
  const [date, setDate] = useState(todayString())
  const [timeToRead, setTimeToRead] = useState(5)
  const [author, setAuthor] = useState('')
  const [category, setCategory] = useState('')
  const [featured, setFeatured] = useState(false)
  const [coverPath, setCoverPath] = useState('')
  const [notionZipPath, setNotionZipPath] = useState('')

  // Submission state
  const [submitting, setSubmitting] = useState(false)
  const [cliOutput, setCliOutput] = useState<string[]>([])
  const [submitResult, setSubmitResult] = useState<'success' | 'error' | null>(null)

  // Validation
  const [errors, setErrors] = useState<Record<string, string>>({})

  // Repo path for avatar images
  const [repoPath, setRepoPath] = useState('')
  useEffect(() => {
    window.api.getRepoPath().then(setRepoPath).catch(() => {})
  }, [])

  // Auto-generate slug from title
  useEffect(() => {
    if (!slugManual) {
      setSlug(generateSlug(title))
    }
  }, [title, slugManual])

  // Category options for Select component
  const categoryOptions = useMemo(
    () => categories.map((c) => ({ value: c.slug, label: c.name })),
    [categories]
  )

  const loading = authorsLoading || blogsLoading || categoriesLoading

  // Real-time slug uniqueness check
  const existingBlogSlugs = useMemo(() => existingBlogs.map((b) => b.slug), [existingBlogs])
  const slugTakenError = useMemo(() => {
    const trimmed = slug.trim()
    if (trimmed && existingBlogSlugs.includes(trimmed)) {
      return 'This slug is already taken'
    }
    return undefined
  }, [slug, existingBlogSlugs])

  /* ─── Validation ─── */
  const validate = useCallback((): boolean => {
    const errs: Record<string, string> = {}
    if (!title.trim()) errs.title = 'Title is required'
    if (!slug.trim()) errs.slug = 'Slug is required'
    else if (existingBlogSlugs.includes(slug.trim())) errs.slug = 'This slug is already taken'
    if (!description.trim()) errs.description = 'Description is required'
    if (!date) errs.date = 'Date is required'
    if (!author) errs.author = 'Author is required'
    if (!category) errs.category = 'Category is required'
    if (timeToRead < 1) errs.timeToRead = 'Must be at least 1 minute'
    setErrors(errs)
    return Object.keys(errs).length === 0
  }, [title, slug, description, date, author, category, timeToRead, existingBlogSlugs])

  /* ─── Submit ─── */
  const handleSubmit = async (): Promise<void> => {
    if (!validate()) return

    setSubmitting(true)
    setCliOutput([])
    setSubmitResult(null)

    const options: CreateBlogOptions = {
      title: title.trim(),
      slug: slug.trim(),
      description: description.trim(),
      date,
      timeToRead,
      author,
      category,
      featured
    }
    if (coverPath) options.cover = coverPath
    if (notionZipPath) options.importNotion = notionZipPath

    try {
      window.api.onCliOutput((data: string) => {
        setCliOutput((prev) => [...prev, data])
      })

      const result = await window.api.createBlog(options)

      window.api.removeCliOutputListener()

      if (result.success) {
        setSubmitResult('success')
        toast.success('Blog post created successfully!')
      } else {
        setSubmitResult('error')
        toast.error(result.error ?? 'Failed to create blog post')
      }
    } catch (err) {
      window.api.removeCliOutputListener()
      setSubmitResult('error')
      toast.error(err instanceof Error ? err.message : 'An unexpected error occurred')
    } finally {
      setSubmitting(false)
    }
  }

  /* ─── Reset for "Create Another" ─── */
  const handleCreateAnother = (): void => {
    setTitle('')
    setSlug('')
    setSlugManual(false)
    setDescription('')
    setDate(todayString())
    setTimeToRead(5)
    setAuthor('')
    setCategory('')
    setFeatured(false)
    setCoverPath('')
    setNotionZipPath('')
    setCliOutput([])
    setSubmitResult(null)
    setErrors({})
  }

  /* ─── Cover image picker ─── */
  const handleSelectCover = async (): Promise<void> => {
    const path = await window.api.selectImage()
    if (path) setCoverPath(path)
  }

  /* ─── Notion zip picker ─── */
  const handleSelectZip = async (): Promise<void> => {
    const path = await window.api.selectZip()
    if (path) setNotionZipPath(path)
  }

  /* ─── Loading state ─── */
  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-3 p-8 animate-fade-in">
        <Spinner size="lg" />
        <p className="text-sm text-text-secondary">Loading form data...</p>
      </div>
    )
  }

  /* ─── Success state ─── */
  if (submitResult === 'success') {
    return (
      <div className="p-8 animate-fade-in">
        {/* Back link */}
        <button
          type="button"
          onClick={() => navigate('/dashboard/blogs')}
          className="inline-flex items-center gap-1.5 text-sm text-text-secondary hover:text-text-primary transition-colors mb-6 cursor-pointer"
        >
          <ArrowLeft size={16} />
          Back to Blog Posts
        </button>

        <div className="max-w-2xl">
          <div className="bg-success-muted border border-success/20 rounded-lg p-8 text-center mb-6">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-success/10 mb-4">
              <Check size={28} className="text-success" />
            </div>
            <h2 className="text-lg font-semibold text-text-primary mb-1">Blog post created!</h2>
            <p className="text-sm text-text-secondary">
              &ldquo;{title}&rdquo; has been added to your website.
            </p>
          </div>

          {/* CLI output */}
          {cliOutput.length > 0 && (
            <div className="mb-6">
              <TerminalOutput lines={cliOutput} title="CLI Output" />
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-3">
            <Button
              variant="primary"
              icon={FilePlus}
              onClick={handleCreateAnother}
            >
              Create Another
            </Button>
            <Button
              variant="secondary"
              icon={List}
              onClick={() => navigate('/dashboard/blogs')}
            >
              View Blogs
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-8 animate-fade-in">
      {/* Back link */}
      <button
        type="button"
        onClick={() => navigate('/dashboard/blogs')}
        className="inline-flex items-center gap-1.5 text-sm text-text-secondary hover:text-text-primary transition-colors mb-6 cursor-pointer"
      >
        <ArrowLeft size={16} />
        Back to Blog Posts
      </button>

      {/* Page title */}
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-text-primary tracking-tight">
          Create Blog Post
        </h1>
        <p className="mt-1 text-sm text-text-secondary">
          Fill in the details below to create a new blog post for the website.
        </p>
      </div>

      <div className="max-w-2xl space-y-6">
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

        {/* Slug */}
        <FormField
          label="Slug"
          required
          error={errors.slug || slugTakenError}
          helperText={slugTakenError ? undefined : (slugManual ? 'Custom slug (editing manually)' : 'Auto-generated from title')}
        >
          <Input
            value={slug}
            onChange={(e) => {
              setSlugManual(true)
              setSlug(e.target.value)
              if (errors.slug) setErrors((prev) => ({ ...prev, slug: '' }))
            }}
            placeholder="e.g., introducing-appwrite-functions-2"
            error={errors.slug || slugTakenError}
          />
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
              'w-full bg-bg-elevated text-text-primary rounded-md font-sans',
              'border px-3 py-2 text-sm leading-relaxed',
              'transition-all duration-200',
              'placeholder:text-text-tertiary',
              'resize-y min-h-[80px]',
              errors.description
                ? 'border-danger focus:border-danger focus:shadow-[0_0_0_3px_rgba(217,48,54,0.1)]'
                : 'border-border-primary hover:border-border-secondary focus:border-accent focus:shadow-[0_0_0_3px_var(--color-accent-muted)]',
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
            onChange={(slug) => {
              setAuthor(slug)
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

        {/* Featured */}
        <div className="flex items-center justify-between py-2">
          <div>
            <p className="text-sm font-medium text-text-primary">Featured Post</p>
            <p className="text-xs text-text-tertiary mt-0.5">
              Featured posts appear prominently on the homepage
            </p>
          </div>
          <Toggle checked={featured} onChange={setFeatured} />
        </div>

        {/* Divider */}
        <div className="border-t border-border-primary" />

        {/* Cover Image */}
        <FormField label="Cover Image" helperText="Optional. Select a cover image for the blog post.">
          {coverPath ? (
            <div className="relative rounded-lg overflow-hidden border border-border-primary bg-bg-secondary">
              <img
                src={`file://${coverPath}`}
                alt="Cover preview"
                className="w-full h-40 object-cover"
                onError={(e) => {
                  ;(e.target as HTMLImageElement).style.display = 'none'
                }}
              />
              <div className="absolute top-2 right-2 flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setCoverPath('')}
                  className={clsx(
                    'p-1.5 rounded-md',
                    'bg-bg-elevated/90 backdrop-blur-sm',
                    'text-text-secondary hover:text-danger',
                    'border border-border-primary',
                    'transition-colors duration-150 cursor-pointer'
                  )}
                  title="Remove cover image"
                >
                  <X size={14} />
                </button>
              </div>
              <div className="px-3 py-2 text-xs text-text-tertiary truncate border-t border-border-primary">
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

        {/* Notion Import */}
        <FormField
          label="Notion Import"
          helperText="Optional. Import content from a Notion export (.zip). The CLI will handle conversion."
        >
          {notionZipPath ? (
            <div
              className={clsx(
                'flex items-center gap-3 px-4 py-3',
                'bg-bg-secondary rounded-lg',
                'border border-border-primary'
              )}
            >
              <FileArchive size={18} className="shrink-0 text-accent" />
              <span className="flex-1 text-sm text-text-primary truncate">
                {notionZipPath.split('/').pop()}
              </span>
              <button
                type="button"
                onClick={() => setNotionZipPath('')}
                className="shrink-0 p-1 rounded-sm text-text-tertiary hover:text-danger transition-colors cursor-pointer"
                title="Remove zip file"
              >
                <X size={14} />
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <FileDropZone
                accept=".zip"
                onFile={setNotionZipPath}
                label="Drop a Notion export .zip here, or click to browse"
                icon={FileArchive}
              />
              <div className="flex items-center gap-3">
                <div className="flex-1 border-t border-border-primary" />
                <span className="text-xs text-text-tertiary">or</span>
                <div className="flex-1 border-t border-border-primary" />
              </div>
              <Button
                variant="secondary"
                size="sm"
                icon={FileArchive}
                onClick={handleSelectZip}
              >
                Browse for .zip
              </Button>
            </div>
          )}
        </FormField>

        {/* CLI Output (visible during/after submission) */}
        {cliOutput.length > 0 && (
          <TerminalOutput lines={cliOutput} title="CLI Output" />
        )}

        {/* Error state after submission */}
        {submitResult === 'error' && (
          <div className="bg-danger-muted border border-danger/20 rounded-lg p-4">
            <p className="text-sm text-danger font-medium">Failed to create blog post</p>
            <p className="text-xs text-text-secondary mt-1">
              Check the CLI output above for details, or try again.
            </p>
          </div>
        )}

        {/* Submit */}
        <div className="flex items-center gap-3 pt-2 pb-4">
          <Button
            variant="primary"
            size="lg"
            loading={submitting}
            onClick={handleSubmit}
            disabled={submitting || !!slugTakenError}
            icon={FilePlus}
          >
            Create Blog Post
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
      </div>
    </div>
  )
}
