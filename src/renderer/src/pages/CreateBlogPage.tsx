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
  List,
  Sparkles
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
import { InfoPill, PageIntro, PageScaffold, SurfaceCard } from '../components/layout/PageScaffold'
import { requestGitStatusRefresh } from '../hooks/gitStatusRefresh'
import type { Author, CreateBlogOptions } from '../types'

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

interface AuthorDropdownProps {
  authors: Author[]
  repoPath: string
  value: string
  onChange: (slug: string) => void
  error?: string
}

function AuthorDropdown({ authors, repoPath, value, onChange, error }: AuthorDropdownProps): React.JSX.Element {
  const [isOpen, setIsOpen] = useState(false)
  const [search, setSearch] = useState('')
  const containerRef = useRef<HTMLDivElement>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)

  const selectedAuthor = authors.find((author) => author.slug === value)

  const filtered = useMemo(() => {
    if (!search.trim()) return authors
    const query = search.toLowerCase()
    return authors.filter((author) => author.name.toLowerCase().includes(query) || author.slug.toLowerCase().includes(query))
  }, [authors, search])

  useEffect(() => {
    const handler = (event: MouseEvent): void => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
        setSearch('')
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

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
          setIsOpen((current) => !current)
          setSearch('')
        }}
        className={clsx(
          'flex w-full items-center gap-3 rounded-[12px] border px-4 py-2.5 text-left transition-all duration-200',
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
            <AuthorAvatar src={getAvatarSrc(selectedAuthor)} name={selectedAuthor.name} size="sm" />
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
        <ChevronDown size={16} className={clsx('shrink-0 text-text-tertiary transition-transform duration-200', isOpen && 'rotate-180')} />
      </button>

      {isOpen && (
        <div className="absolute left-0 right-0 top-full z-30 mt-2 overflow-hidden rounded-[18px] border border-white/10 bg-[linear-gradient(180deg,rgba(26,26,30,0.98),rgba(12,12,14,0.98))] shadow-[0_24px_70px_rgba(3,7,18,0.38)] animate-scale-in">
          <div className="border-b border-white/8 p-3">
            <div className="relative">
              <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-text-tertiary" />
              <input
                ref={searchInputRef}
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search authors..."
                className="w-full rounded-[12px] border border-white/10 bg-white/[0.04] py-2.5 pl-10 pr-4 text-sm text-text-primary focus:border-white/18 focus:shadow-[0_0_0_3px_rgba(255,255,255,0.05)] focus:outline-none"
              />
            </div>
          </div>

          <div className="max-h-60 overflow-y-auto p-2">
            {filtered.length === 0 ? (
              <div className="px-3 py-6 text-center text-xs text-text-tertiary">No authors found</div>
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
                      'flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left transition-colors duration-150',
                      isSelected ? 'bg-accent-muted text-accent' : 'text-text-primary hover:bg-white/[0.05]'
                    )}
                  >
                    <AuthorAvatar src={getAvatarSrc(author)} name={author.name} size="sm" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{author.name}</p>
                      <p className="mt-1 truncate text-xs text-text-tertiary">{author.role}</p>
                    </div>
                    {isSelected && <Check size={14} className="shrink-0 text-accent" />}
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

function MetaToggle({
  title,
  description,
  checked,
  onChange
}: {
  title: string
  description: string
  checked: boolean
  onChange: (checked: boolean) => void
}): React.JSX.Element {
  return (
    <div className="flex items-center justify-between rounded-[14px] border border-white/8 bg-white/[0.03] px-4 py-3.5">
      <div>
        <p className="text-sm font-medium text-text-primary">{title}</p>
        <p className="mt-1 text-xs leading-6 text-text-tertiary">{description}</p>
      </div>
      <Toggle checked={checked} onChange={onChange} />
    </div>
  )
}

function FieldTextarea({
  value,
  onChange,
  placeholder,
  rows = 3,
  error,
  disabled = false
}: {
  value: string
  onChange: (value: string) => void
  placeholder: string
  rows?: number
  error?: string
  disabled?: boolean
}): React.JSX.Element {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      rows={rows}
      disabled={disabled}
      className={clsx(
        'min-h-[110px] w-full resize-y rounded-[12px] border px-4 py-3 text-sm leading-7',
        'bg-[linear-gradient(180deg,rgba(22,22,26,0.94),rgba(14,14,18,0.9))] text-text-primary placeholder:text-text-tertiary transition-all duration-200',
        error
          ? 'border-danger/45 focus:border-danger focus:shadow-[0_0_0_3px_rgba(255,140,140,0.12)]'
          : 'border-white/10 hover:border-white/16 focus:border-white/18 focus:shadow-[0_0_0_3px_rgba(255,255,255,0.05)]',
        'focus:outline-none disabled:cursor-not-allowed disabled:bg-white/[0.03] disabled:text-text-tertiary'
      )}
    />
  )
}

export default function CreateBlogPage(): React.JSX.Element {
  const navigate = useNavigate()
  const toast = useToast()
  const { authors, loading: authorsLoading } = useAuthors()
  const { blogs: existingBlogs, loading: blogsLoading } = useBlogs()
  const { categories, loading: categoriesLoading } = useCategories()

  const [title, setTitle] = useState('')
  const [slug, setSlug] = useState('')
  const [slugManual, setSlugManual] = useState(false)
  const [description, setDescription] = useState('')
  const [date, setDate] = useState(todayString())
  const [timeToRead, setTimeToRead] = useState(5)
  const [author, setAuthor] = useState('')
  const [category, setCategory] = useState('')
  const [featured, setFeatured] = useState(false)
  const [unlisted, setUnlisted] = useState(false)
  const [coverPath, setCoverPath] = useState('')
  const [notionZipPath, setNotionZipPath] = useState('')

  const [submitting, setSubmitting] = useState(false)
  const [cliOutput, setCliOutput] = useState<string[]>([])
  const [submitResult, setSubmitResult] = useState<'success' | 'error' | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const [repoPath, setRepoPath] = useState('')
  useEffect(() => {
    window.api.getRepoPath().then(setRepoPath).catch(() => {})
  }, [])

  useEffect(() => {
    if (!slugManual) {
      setSlug(generateSlug(title))
    }
  }, [title, slugManual])

  const categoryOptions = useMemo(() => categories.map((category) => ({ value: category.slug, label: category.name })), [categories])
  const loading = authorsLoading || blogsLoading || categoriesLoading
  const existingBlogSlugs = useMemo(() => existingBlogs.map((blog) => blog.slug), [existingBlogs])
  const slugTakenError = useMemo(() => {
    const trimmed = slug.trim()
    if (trimmed && existingBlogSlugs.includes(trimmed)) {
      return 'This slug is already taken'
    }
    return undefined
  }, [slug, existingBlogSlugs])

  const validate = useCallback((): boolean => {
    const nextErrors: Record<string, string> = {}
    if (!title.trim()) nextErrors.title = 'Title is required'
    if (!slug.trim()) nextErrors.slug = 'Slug is required'
    else if (existingBlogSlugs.includes(slug.trim())) nextErrors.slug = 'This slug is already taken'
    if (!description.trim()) nextErrors.description = 'Description is required'
    if (!date) nextErrors.date = 'Date is required'
    if (!author) nextErrors.author = 'Author is required'
    if (!category) nextErrors.category = 'Category is required'
    if (timeToRead < 1) nextErrors.timeToRead = 'Must be at least 1 minute'
    setErrors(nextErrors)
    return Object.keys(nextErrors).length === 0
  }, [title, slug, description, date, author, category, timeToRead, existingBlogSlugs])

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
      featured,
      unlisted
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
        requestGitStatusRefresh()
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
    setUnlisted(false)
    setCoverPath('')
    setNotionZipPath('')
    setCliOutput([])
    setSubmitResult(null)
    setErrors({})
  }

  const handleSelectCover = async (): Promise<void> => {
    const path = await window.api.selectImage()
    if (path) setCoverPath(path)
  }

  const handleSelectZip = async (): Promise<void> => {
    const path = await window.api.selectZip()
    if (path) setNotionZipPath(path)
  }

  const selectedAuthor = authors.find((entry) => entry.slug === author)
  const selectedCategory = categories.find((entry) => entry.slug === category)

  if (loading) {
    return (
      <PageScaffold>
        <SurfaceCard className="flex min-h-[24rem] flex-col items-center justify-center">
          <Spinner size="lg" className="text-cyan" />
          <p className="mt-4 text-sm text-text-secondary">Loading form data...</p>
        </SurfaceCard>
      </PageScaffold>
    )
  }

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
            <h2 className="mt-5 font-display text-4xl text-text-primary">Blog post created</h2>
            <p className="mx-auto mt-3 max-w-xl text-sm leading-7 text-text-secondary">
              “{title}” is now part of the website repository and ready for further editing or review.
            </p>
            {cliOutput.length > 0 && <div className="mt-8"><TerminalOutput lines={cliOutput} title="Create Blog" /></div>}
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <Button variant="primary" icon={FilePlus} onClick={handleCreateAnother}>
                Create Another
              </Button>
              <Button variant="secondary" icon={List} onClick={() => navigate('/dashboard/blogs')}>
                View Blogs
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
          eyebrow="New Story"
          title="Launch a post with structure, not guesswork."
          description="Capture metadata once, keep the slug clean, and stage optional assets like a cover image or Notion export before the CLI writes everything to the repository."
          meta={
            <>
              <InfoPill>{existingBlogs.length} existing posts</InfoPill>
              <InfoPill>{categories.length} categories available</InfoPill>
            </>
          }
          actions={
            <Button variant="primary" size="lg" icon={Sparkles} onClick={handleSubmit} loading={submitting} disabled={submitting || !!slugTakenError}>
              Create Blog Post
            </Button>
          }
        />

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
          <SurfaceCard className="p-6 sm:p-8" highlight>
            <div className="space-y-8">
              <div className="space-y-2">
                <p className="text-xs font-medium uppercase tracking-[0.18em] text-text-tertiary">Metadata</p>
                <h2 className="font-display text-3xl text-text-primary">Core story details</h2>
              </div>

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

              <FormField
                label="Slug"
                required
                error={errors.slug || slugTakenError}
                helperText={slugTakenError ? undefined : slugManual ? 'Custom slug (editing manually).' : 'Auto-generated from the title.'}
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

              <FormField label="Description" required error={errors.description}>
                <FieldTextarea
                  value={description}
                  onChange={(value) => {
                    setDescription(value)
                    if (errors.description) setErrors((prev) => ({ ...prev, description: '' }))
                  }}
                  placeholder="A short summary that sells the post and feeds metadata surfaces."
                  error={errors.description}
                />
              </FormField>

              <div className="grid gap-4 sm:grid-cols-2">
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
                <FormField label="Time to Read" error={errors.timeToRead} helperText="In minutes">
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

              <FormField label="Author" required error={errors.author}>
                <AuthorDropdown
                  authors={authors}
                  repoPath={repoPath}
                  value={author}
                  onChange={(slugValue) => {
                    setAuthor(slugValue)
                    if (errors.author) setErrors((prev) => ({ ...prev, author: '' }))
                  }}
                  error={errors.author}
                />
              </FormField>

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

              <div className="grid gap-4 sm:grid-cols-2">
                <MetaToggle title="Featured post" description="Promote this story on high-visibility homepage slots." checked={featured} onChange={setFeatured} />
                <MetaToggle title="Unlisted" description="Hide it from the public listing while keeping the route available." checked={unlisted} onChange={setUnlisted} />
              </div>

              <div className="elevated-divider" />

              <div className="space-y-2">
                <p className="text-xs font-medium uppercase tracking-[0.18em] text-text-tertiary">Assets</p>
                <h2 className="font-display text-3xl text-text-primary">Attach optional inputs</h2>
              </div>

              <FormField label="Cover image" helperText="Optional. Select a cover image for the blog post.">
                {coverPath ? (
                  <div className="overflow-hidden rounded-[18px] border border-white/10 bg-white/[0.03]">
                    <div className="relative">
                      <img src={`file://${coverPath}`} alt="Cover preview" className="h-52 w-full object-cover" onError={(e) => { ;(e.target as HTMLImageElement).style.display = 'none' }} />
                      <div className="absolute right-3 top-3 flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setCoverPath('')}
                          className="rounded-2xl border border-white/10 bg-[#08111f]/90 p-2 text-text-secondary transition-colors duration-150 hover:text-danger"
                          title="Remove cover image"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    </div>
                    <div className="border-t border-white/8 px-4 py-3 text-xs text-text-tertiary">{coverPath.split('/').pop()}</div>
                  </div>
                ) : (
                  <Button variant="secondary" icon={ImageIcon} onClick={handleSelectCover}>
                    Choose Image
                  </Button>
                )}
              </FormField>

              <FormField label="Notion import" helperText="Optional. Import content from a Notion export (.zip). The CLI will handle conversion.">
                {notionZipPath ? (
                  <div className="flex items-center gap-3 rounded-[14px] border border-white/10 bg-white/[0.03] px-4 py-3.5">
                    <FileArchive size={18} className="shrink-0 text-accent" />
                    <span className="flex-1 truncate text-sm text-text-primary">{notionZipPath.split('/').pop()}</span>
                    <button type="button" onClick={() => setNotionZipPath('')} className="shrink-0 rounded-xl p-1 text-text-tertiary transition-colors hover:text-danger" title="Remove zip file">
                      <X size={14} />
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <FileDropZone accept=".zip" onFile={setNotionZipPath} label="Drop a Notion export .zip here" icon={FileArchive} />
                    <div className="flex items-center gap-3">
                      <div className="elevated-divider flex-1" />
                      <span className="text-xs uppercase tracking-[0.14em] text-text-tertiary">or</span>
                      <div className="elevated-divider flex-1" />
                    </div>
                    <Button variant="secondary" size="sm" icon={FileArchive} onClick={handleSelectZip}>
                      Browse for .zip
                    </Button>
                  </div>
                )}
              </FormField>

              <div className="flex flex-wrap items-center gap-3 pt-2">
                <Button variant="primary" size="lg" loading={submitting} onClick={handleSubmit} disabled={submitting || !!slugTakenError} icon={FilePlus}>
                  Create Blog Post
                </Button>
                <Button variant="ghost" size="lg" onClick={() => navigate('/dashboard/blogs')} disabled={submitting}>
                  Cancel
                </Button>
              </div>
            </div>
          </SurfaceCard>

          <div className="space-y-4 xl:sticky xl:top-8 xl:self-start">
            <SurfaceCard>
              <p className="text-xs uppercase tracking-[0.18em] text-text-tertiary">Live summary</p>
              <h2 className="mt-2 font-display text-3xl text-text-primary">Story snapshot</h2>
              <div className="mt-5 space-y-4 text-sm text-text-secondary">
                <div className="flex items-center justify-between gap-3">
                  <span>Title</span>
                  <span className="max-w-[12rem] truncate text-right text-text-primary">{title || 'Untitled draft'}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span>Slug</span>
                  <span className="muted-code">{slug || 'pending-slug'}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span>Author</span>
                  <span className="max-w-[10rem] truncate text-right text-text-primary">{selectedAuthor?.name ?? 'Unassigned'}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span>Category</span>
                  <span className="max-w-[10rem] truncate text-right text-text-primary">{selectedCategory?.name ?? 'Unassigned'}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span>Reading time</span>
                  <span className="text-text-primary">{timeToRead} min</span>
                </div>
              </div>
              <div className="mt-5 flex flex-wrap gap-2">
                {featured && <InfoPill>Featured</InfoPill>}
                {unlisted && <InfoPill>Unlisted</InfoPill>}
                {coverPath && <InfoPill>Cover attached</InfoPill>}
                {notionZipPath && <InfoPill>Notion archive ready</InfoPill>}
              </div>
            </SurfaceCard>

            <SurfaceCard>
              <p className="text-xs uppercase tracking-[0.18em] text-text-tertiary">Guidance</p>
              <ul className="mt-4 space-y-3 text-sm leading-7 text-text-secondary">
                <li>Keep the slug stable once you share links externally.</li>
                <li>Use featured only when the story deserves homepage emphasis.</li>
                <li>Attach a Notion archive if you want the CLI to seed content immediately.</li>
              </ul>
            </SurfaceCard>
          </div>
        </div>

        {cliOutput.length > 0 && <TerminalOutput lines={cliOutput} title="Create Blog" />}

        {submitResult === 'error' && (
          <SurfaceCard className="border-danger/20 bg-danger-muted/80">
            <p className="text-sm font-medium text-danger">Failed to create blog post</p>
            <p className="mt-2 text-sm leading-7 text-text-secondary">Check the CLI output above for details, then correct the inputs and try again.</p>
          </SurfaceCard>
        )}
      </div>
    </PageScaffold>
  )
}
