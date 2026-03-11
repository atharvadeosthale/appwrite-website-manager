import { useMemo, useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import clsx from 'clsx'
import { Plus, FileText, Search, Filter, ExternalLink, Code, Pencil } from 'lucide-react'
import { useBlogs } from '../hooks/useBlogs'
import { useAuthors } from '../hooks/useAuthors'
import { useCategories } from '../hooks/useCategories'
import { Button } from '../components/ui/Button'
import { Spinner } from '../components/ui/Spinner'
import { AuthorAvatar } from '../components/shared/AuthorAvatar'
import type { Blog, Author, Category } from '../types'

function useRepoPath(): string {
  const [repoPath, setRepoPath] = useState('')
  useEffect(() => {
    window.api.getRepoPath().then(setRepoPath)
  }, [])
  return repoPath
}

/* ─── Date formatter ─── */

function formatDate(dateStr: string): string {
  try {
    const date = new Date(dateStr + 'T00:00:00')
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  } catch {
    return dateStr
  }
}

/* ─── Component ─── */

export default function BlogListPage(): React.JSX.Element {
  const navigate = useNavigate()
  const { blogs, loading: blogsLoading, error: blogsError } = useBlogs()
  const { authors, loading: authorsLoading } = useAuthors()
  const { categories, loading: categoriesLoading } = useCategories()

  const [search, setSearch] = useState('')
  const [filterCategory, setFilterCategory] = useState('')
  const [filterAuthor, setFilterAuthor] = useState('')
  const [sortKey, setSortKey] = useState<'title' | 'date' | null>('date')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')

  const repoPath = useRepoPath()
  const loading = blogsLoading || authorsLoading || categoriesLoading

  // Lookup maps for joining slugs to names
  const authorMap = useMemo<Record<string, Author>>(
    () => Object.fromEntries(authors.map((a) => [a.slug, a])),
    [authors]
  )
  const categoryMap = useMemo<Record<string, Category>>(
    () => Object.fromEntries(categories.map((c) => [c.slug, c])),
    [categories]
  )

  // Filtered and sorted blogs
  const displayBlogs = useMemo(() => {
    let result = [...blogs]

    // Search filter
    if (search.trim()) {
      const query = search.toLowerCase()
      result = result.filter(
        (b) =>
          b.title.toLowerCase().includes(query) ||
          b.slug.toLowerCase().includes(query)
      )
    }

    // Category filter
    if (filterCategory) {
      result = result.filter((b) => b.category === filterCategory)
    }

    // Author filter
    if (filterAuthor) {
      result = result.filter((b) => b.author === filterAuthor)
    }

    // Sort
    if (sortKey) {
      result.sort((a, b) => {
        const aVal = a[sortKey] ?? ''
        const bVal = b[sortKey] ?? ''
        const cmp = String(aVal).localeCompare(String(bVal), undefined, { numeric: true })
        return sortDir === 'asc' ? cmp : -cmp
      })
    }

    return result
  }, [blogs, search, filterCategory, filterAuthor, sortKey, sortDir])

  const handleSort = (key: 'title' | 'date'): void => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDir('asc')
    }
  }

  const SortIndicator = ({ column }: { column: 'title' | 'date' }): React.JSX.Element | null => {
    if (sortKey !== column) {
      return (
        <span className="text-text-tertiary opacity-0 group-hover:opacity-100 transition-opacity ml-1">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M6 2.5L8.5 5.5H3.5L6 2.5Z" fill="currentColor" />
            <path d="M6 9.5L3.5 6.5H8.5L6 9.5Z" fill="currentColor" />
          </svg>
        </span>
      )
    }
    return (
      <span className="text-accent ml-1">
        {sortDir === 'asc' ? (
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M6 3L9 7H3L6 3Z" fill="currentColor" />
          </svg>
        ) : (
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M6 9L3 5H9L6 9Z" fill="currentColor" />
          </svg>
        )}
      </span>
    )
  }

  // Determine if we have any active filters
  const hasFilters = search || filterCategory || filterAuthor

  /* ─── Loading state ─── */
  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-3 p-8 animate-fade-in">
        <Spinner size="lg" />
        <p className="text-sm text-text-secondary">Loading blog posts...</p>
      </div>
    )
  }

  /* ─── Error state ─── */
  if (blogsError) {
    return (
      <div className="p-8 animate-fade-in">
        <div className="bg-danger-muted border border-danger/20 rounded-lg p-6 text-center">
          <p className="text-sm text-danger font-medium">Failed to load blog posts</p>
          <p className="text-xs text-text-secondary mt-1">{blogsError}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-8 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-text-primary tracking-tight">Blog Posts</h1>
          <p className="mt-1 text-sm text-text-secondary">
            {blogs.length} {blogs.length === 1 ? 'post' : 'posts'} in your website
          </p>
        </div>
        <Button
          variant="primary"
          icon={Plus}
          onClick={() => navigate('/dashboard/blogs/create')}
        >
          Create Blog
        </Button>
      </div>

      {/* Search + Filters bar */}
      <div className="flex items-center gap-3 mb-5">
        {/* Search */}
        <div className="relative flex-1 max-w-sm">
          <Search
            size={15}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary"
          />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by title..."
            className={clsx(
              'w-full pl-9 pr-3 py-2',
              'text-sm bg-bg-elevated rounded-md',
              'border border-border-primary',
              'focus:outline-none focus:border-accent focus:shadow-[0_0_0_3px_var(--color-accent-muted)]',
              'placeholder:text-text-tertiary',
              'transition-all duration-200'
            )}
          />
        </div>

        {/* Category filter */}
        <div className="relative">
          <Filter
            size={13}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary pointer-events-none"
          />
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className={clsx(
              'appearance-none pl-8 pr-8 py-2',
              'text-sm bg-bg-elevated rounded-md',
              'border border-border-primary',
              'focus:outline-none focus:border-accent focus:shadow-[0_0_0_3px_var(--color-accent-muted)]',
              'transition-all duration-200 cursor-pointer',
              !filterCategory && 'text-text-tertiary'
            )}
          >
            <option value="">All Categories</option>
            {categories.map((c) => (
              <option key={c.slug} value={c.slug}>
                {c.name}
              </option>
            ))}
          </select>
          <svg
            width="14"
            height="14"
            viewBox="0 0 16 16"
            fill="none"
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-tertiary pointer-events-none"
          >
            <path d="M4 6L8 10L12 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </div>

        {/* Author filter */}
        <div className="relative">
          <Filter
            size={13}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary pointer-events-none"
          />
          <select
            value={filterAuthor}
            onChange={(e) => setFilterAuthor(e.target.value)}
            className={clsx(
              'appearance-none pl-8 pr-8 py-2',
              'text-sm bg-bg-elevated rounded-md',
              'border border-border-primary',
              'focus:outline-none focus:border-accent focus:shadow-[0_0_0_3px_var(--color-accent-muted)]',
              'transition-all duration-200 cursor-pointer',
              !filterAuthor && 'text-text-tertiary'
            )}
          >
            <option value="">All Authors</option>
            {authors.map((a) => (
              <option key={a.slug} value={a.slug}>
                {a.name}
              </option>
            ))}
          </select>
          <svg
            width="14"
            height="14"
            viewBox="0 0 16 16"
            fill="none"
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-tertiary pointer-events-none"
          >
            <path d="M4 6L8 10L12 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </div>

        {/* Clear filters */}
        {hasFilters && (
          <button
            type="button"
            onClick={() => {
              setSearch('')
              setFilterCategory('')
              setFilterAuthor('')
            }}
            className="text-xs text-accent hover:text-accent-hover transition-colors cursor-pointer font-medium"
          >
            Clear filters
          </button>
        )}
      </div>

      {/* Empty state — no blogs at all */}
      {blogs.length === 0 && (
        <div className="bg-bg-elevated border border-border-primary rounded-lg p-12 text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-accent-muted mb-4">
            <FileText size={24} className="text-accent" />
          </div>
          <h3 className="text-base font-semibold text-text-primary mb-1">No blog posts yet</h3>
          <p className="text-sm text-text-secondary mb-5 max-w-sm mx-auto">
            Get started by creating your first blog post. It only takes a minute.
          </p>
          <Button
            variant="primary"
            icon={Plus}
            onClick={() => navigate('/dashboard/blogs/create')}
          >
            Create Your First Post
          </Button>
        </div>
      )}

      {/* Table */}
      {blogs.length > 0 && (
        <div className="rounded-lg border border-border-primary bg-bg-elevated overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border-primary bg-bg-secondary/50">
                  <th
                    className="group px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase tracking-wide cursor-pointer select-none hover:text-text-primary transition-colors"
                    onClick={() => handleSort('title')}
                  >
                    <span className="inline-flex items-center">
                      Title
                      <SortIndicator column="title" />
                    </span>
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase tracking-wide">
                    Author
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase tracking-wide">
                    Category
                  </th>
                  <th
                    className="group px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase tracking-wide cursor-pointer select-none hover:text-text-primary transition-colors"
                    onClick={() => handleSort('date')}
                  >
                    <span className="inline-flex items-center">
                      Date
                      <SortIndicator column="date" />
                    </span>
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase tracking-wide">
                    Featured
                  </th>
                </tr>
              </thead>
              <tbody>
                {displayBlogs.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-4 py-10 text-center text-sm text-text-tertiary"
                    >
                      No matching blog posts found
                    </td>
                  </tr>
                ) : (
                  displayBlogs.map((blog: Blog) => {
                    const author = authorMap[blog.author]
                    const category = categoryMap[blog.category]
                    return (
                      <tr
                        key={blog.slug}
                        className="group border-b border-border-primary/60 last:border-0 hover:bg-bg-secondary/30 transition-colors duration-100"
                      >
                        {/* Title */}
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="flex flex-col min-w-0 flex-1">
                              <span className="text-sm font-medium text-text-primary leading-snug">
                                {blog.title}
                              </span>
                              <span className="text-xs text-text-tertiary mt-0.5 truncate max-w-xs">
                                {blog.slug}
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={() => window.open(`http://localhost:5170/blog/post/${blog.slug}`, '_blank')}
                              className="shrink-0 inline-flex items-center justify-center w-7 h-7 rounded-md
                                text-text-tertiary hover:text-accent hover:bg-accent-muted
                                opacity-0 group-hover:opacity-100
                                transition-all duration-200 cursor-pointer"
                              aria-label={`Preview ${blog.title}`}
                              title="Open local preview"
                            >
                              <ExternalLink size={14} strokeWidth={2} />
                            </button>
                            <button
                              type="button"
                              onClick={() => navigate(`/dashboard/blogs/${blog.slug}/edit`)}
                              className="shrink-0 inline-flex items-center justify-center w-7 h-7 rounded-md
                                text-text-tertiary hover:text-accent hover:bg-accent-muted
                                opacity-0 group-hover:opacity-100
                                transition-all duration-200 cursor-pointer"
                              aria-label={`Edit ${blog.title}`}
                              title="Edit blog post"
                            >
                              <Pencil size={14} strokeWidth={2} />
                            </button>
                            <button
                              type="button"
                              onClick={() => window.api.openInCursor(`src/routes/blog/post/${blog.slug}/+page.markdoc`)}
                              className="shrink-0 inline-flex items-center justify-center w-7 h-7 rounded-md
                                text-text-tertiary hover:text-accent hover:bg-accent-muted
                                opacity-0 group-hover:opacity-100
                                transition-all duration-200 cursor-pointer"
                              aria-label={`Open ${blog.title} in Cursor`}
                              title="Open in Cursor"
                            >
                              <Code size={14} strokeWidth={2} />
                            </button>
                          </div>
                        </td>
                        {/* Author */}
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <AuthorAvatar
                              src={author?.avatar && repoPath ? `file://${repoPath}/static${author.avatar}` : undefined}
                              name={author?.name ?? blog.author}
                              size="sm"
                            />
                            <span className="text-sm text-text-primary">
                              {author?.name ?? blog.author}
                            </span>
                          </div>
                        </td>
                        {/* Category */}
                        <td className="px-4 py-3">
                          <span
                            className={clsx(
                              'inline-flex items-center px-2.5 py-0.5 rounded-full',
                              'text-xs font-medium',
                              'bg-bg-secondary text-text-secondary',
                              'border border-border-primary'
                            )}
                          >
                            {category?.name ?? blog.category}
                          </span>
                        </td>
                        {/* Date */}
                        <td className="px-4 py-3 text-sm text-text-secondary tabular-nums">
                          {formatDate(blog.date)}
                        </td>
                        {/* Featured */}
                        <td className="px-4 py-3">
                          {blog.featured ? (
                            <span
                              className={clsx(
                                'inline-flex items-center px-2.5 py-0.5 rounded-full',
                                'text-xs font-medium',
                                'bg-accent-muted text-accent'
                              )}
                            >
                              Featured
                            </span>
                          ) : (
                            <span className="text-xs text-text-tertiary">&mdash;</span>
                          )}
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Footer */}
          <div className="px-4 py-2.5 border-t border-border-primary bg-bg-secondary/30">
            <p className="text-xs text-text-tertiary">
              {displayBlogs.length} {displayBlogs.length === 1 ? 'post' : 'posts'}
              {hasFilters && ` (filtered from ${blogs.length} total)`}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
