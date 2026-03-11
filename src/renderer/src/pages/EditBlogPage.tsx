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
  Save
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
import { FormField } from '../components/forms/FormField'
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

/* ─── Frontmatter helpers ─── */

const FRONTMATTER_REGEX = /^---\n[\s\S]*?\n---\n?/

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

/* ─── EditBlogPage ─── */

export default function EditBlogPage(): React.JSX.Element {
  const { slug } = useParams<{ slug: string }>()
  const navigate = useNavigate()
  const toast = useToast()

  // Load data
  const { authors, loading: authorsLoading } = useAuthors()
  const { blogs, loading: blogsLoading } = useBlogs()
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

  // Validation
  const [errors, setErrors] = useState<Record<string, string>>({})

  // Repo path for avatar images
  const [repoPath, setRepoPath] = useState('')
  useEffect(() => {
    window.api.getRepoPath().then(setRepoPath).catch(() => {})
  }, [])

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
      window.api.readBlogContent(slug).then((result) => {
        if (result.success && result.content) {
          const { frontmatter, body } = stripFrontmatter(result.content)
          frontmatterRef.current = frontmatter
          setMarkdocContent(body)
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

  /* ─── Cover image picker ─── */
  const handleSelectCover = async (): Promise<void> => {
    const path = await window.api.selectImage()
    if (path) setCoverPath(path)
  }

  /* ─── Loading state ─── */
  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-3 p-8 animate-fade-in">
        <Spinner size="lg" />
        <p className="text-sm text-text-secondary">Loading blog data...</p>
      </div>
    )
  }

  /* ─── Blog not found ─── */
  if (!blogsLoading && !blog) {
    return (
      <div className="p-8 animate-fade-in">
        <button
          type="button"
          onClick={() => navigate('/dashboard/blogs')}
          className="inline-flex items-center gap-1.5 text-sm text-text-secondary hover:text-text-primary transition-colors mb-6 cursor-pointer"
        >
          <ArrowLeft size={16} />
          Back to Blog Posts
        </button>

        <div className="max-w-2xl">
          <div className="bg-danger-muted border border-danger/20 rounded-lg p-8 text-center">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-danger/10 mb-4">
              <X size={28} className="text-danger" />
            </div>
            <h2 className="text-lg font-semibold text-text-primary mb-1">Blog post not found</h2>
            <p className="text-sm text-text-secondary">
              No blog post with slug &ldquo;{slug}&rdquo; could be found.
            </p>
          </div>
        </div>
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
            <h2 className="text-lg font-semibold text-text-primary mb-1">Blog post updated!</h2>
            <p className="text-sm text-text-secondary">
              &ldquo;{title}&rdquo; has been saved successfully.
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
              icon={Save}
              onClick={() => {
                setSubmitResult(null)
                setCliOutput([])
              }}
            >
              Continue Editing
            </Button>
            <Button
              variant="secondary"
              icon={ArrowLeft}
              onClick={() => navigate('/dashboard/blogs')}
            >
              Back to Blogs
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
          Edit Blog Post
        </h1>
        <p className="mt-1 text-sm text-text-secondary">
          Editing <span className="font-mono text-text-tertiary">{slug}</span>
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

        {/* Slug (read-only) */}
        <FormField label="Slug" helperText="The slug cannot be changed after creation.">
          <div
            className={clsx(
              'w-full px-3 py-2',
              'bg-bg-secondary rounded-md text-sm',
              'border border-border-primary',
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

        {/* Unlisted */}
        <div className="flex items-center justify-between py-2">
          <div>
            <p className="text-sm font-medium text-text-primary">Unlisted</p>
            <p className="text-xs text-text-tertiary mt-0.5">
              Hidden from blog listing (for SEO blogs)
            </p>
          </div>
          <Toggle checked={unlisted} onChange={setUnlisted} />
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

        {/* Divider */}
        <div className="border-t border-border-primary" />

        {/* Content Editor */}
        <div>
          <h2 className="text-lg font-semibold text-text-primary mb-1">Content</h2>
          <p className="text-xs text-text-tertiary mb-4">
            Edit the blog post content below. Use the toolbar to format text, or switch to source mode for raw markdown.
          </p>
          {contentLoading ? (
            <div className="flex items-center justify-center py-12 bg-bg-elevated rounded-lg border border-border-primary">
              <Spinner size="md" />
              <span className="ml-3 text-sm text-text-secondary">Loading content...</span>
            </div>
          ) : (
            <div className="mdxeditor-wrapper rounded-lg border border-border-primary overflow-hidden [&_.mdxeditor]:bg-bg-elevated [&_.mdxeditor-toolbar]:bg-bg-secondary [&_.mdxeditor-toolbar]:border-b [&_.mdxeditor-toolbar]:border-border-primary [&_.mdxeditor-root-contenteditable]:min-h-[400px] [&_.mdxeditor-root-contenteditable]:px-4 [&_.mdxeditor-root-contenteditable]:py-3 [&_.mdxeditor-root-contenteditable]:text-text-primary [&_.mdxeditor-root-contenteditable>*]:text-text-primary [&_h1]:text-2xl [&_h1]:font-bold [&_h1]:mt-6 [&_h1]:mb-3 [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:mt-5 [&_h2]:mb-2 [&_h3]:text-lg [&_h3]:font-semibold [&_h3]:mt-4 [&_h3]:mb-2 [&_h4]:text-base [&_h4]:font-medium [&_h4]:mt-3 [&_h4]:mb-1 [&_p]:leading-relaxed [&_p]:mb-3 [&_img]:rounded-lg [&_img]:my-4 [&_img]:max-w-full [&_blockquote]:border-l-4 [&_blockquote]:border-accent [&_blockquote]:pl-4 [&_blockquote]:italic [&_blockquote]:text-text-secondary [&_code]:bg-bg-secondary [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded [&_code]:text-sm [&_code]:font-mono [&_pre]:bg-bg-secondary [&_pre]:rounded-lg [&_pre]:p-4 [&_pre]:overflow-x-auto [&_table]:w-full [&_table]:border-collapse [&_th]:bg-bg-secondary [&_th]:border [&_th]:border-border-primary [&_th]:px-3 [&_th]:py-2 [&_th]:text-left [&_th]:font-semibold [&_td]:border [&_td]:border-border-primary [&_td]:px-3 [&_td]:py-2 [&_hr]:border-border-primary [&_hr]:my-6 [&_a]:text-accent [&_a]:underline [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:mb-3 [&_ol]:list-decimal [&_ol]:pl-6 [&_ol]:mb-3 [&_li]:mb-1">
              <MDXEditor
                ref={editorRef}
                markdown={markdocContent}
                plugins={[
                  headingsPlugin({ allowedHeadingLevels: [1, 2, 3, 4, 5, 6] }),
                  listsPlugin(),
                  quotePlugin(),
                  thematicBreakPlugin(),
                  linkPlugin(),
                  linkDialogPlugin(),
                  imagePlugin({
                    disableImageResize: true
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
          <div className="bg-danger-muted border border-danger/20 rounded-lg p-4">
            <p className="text-sm text-danger font-medium">Failed to update blog post</p>
            <p className="text-xs text-text-secondary mt-1">
              Check the CLI output above for details, or try again.
            </p>
          </div>
        )}

        {/* Save / Cancel */}
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
      </div>
    </div>
  )
}
