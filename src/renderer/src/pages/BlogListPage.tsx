import { useMemo, useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import clsx from 'clsx'
import { Plus, FileText, Search, Filter, ExternalLink, Code, Pencil, Star } from 'lucide-react'
import { useBlogs } from '../hooks/useBlogs'
import { useAuthors } from '../hooks/useAuthors'
import { useCategories } from '../hooks/useCategories'
import { Button } from '../components/ui/Button'
import { Spinner } from '../components/ui/Spinner'
import { AuthorAvatar } from '../components/shared/AuthorAvatar'
import { EmptyStatePanel, InfoPill, PageIntro, PageScaffold, SurfaceCard } from '../components/layout/PageScaffold'
import type { Blog, Author, Category } from '../types'

function useRepoPath(): string {
  const [repoPath, setRepoPath] = useState('')
  useEffect(() => {
    window.api.getRepoPath().then(setRepoPath)
  }, [])
  return repoPath
}

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

  const authorMap = useMemo<Record<string, Author>>(() => Object.fromEntries(authors.map((author) => [author.slug, author])), [authors])
  const categoryMap = useMemo<Record<string, Category>>(() => Object.fromEntries(categories.map((category) => [category.slug, category])), [categories])

  const displayBlogs = useMemo(() => {
    let result = [...blogs]

    if (search.trim()) {
      const query = search.toLowerCase()
      result = result.filter((blog) => blog.title.toLowerCase().includes(query) || blog.slug.toLowerCase().includes(query))
    }

    if (filterCategory) {
      result = result.filter((blog) => blog.category === filterCategory)
    }

    if (filterAuthor) {
      result = result.filter((blog) => blog.author === filterAuthor)
    }

    if (sortKey) {
      result.sort((a, b) => {
        const aVal = a[sortKey] ?? ''
        const bVal = b[sortKey] ?? ''
        const comparison = String(aVal).localeCompare(String(bVal), undefined, { numeric: true })
        return sortDir === 'asc' ? comparison : -comparison
      })
    }

    return result
  }, [blogs, search, filterCategory, filterAuthor, sortKey, sortDir])

  const handleSort = (key: 'title' | 'date'): void => {
    if (sortKey === key) {
      setSortDir((direction) => (direction === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDir('asc')
    }
  }

  const hasFilters = search || filterCategory || filterAuthor
  const featuredCount = useMemo(() => blogs.filter((blog) => blog.featured).length, [blogs])

  if (loading) {
    return (
      <PageScaffold>
        <SurfaceCard className="flex min-h-[24rem] flex-col items-center justify-center">
          <Spinner size="lg" className="text-cyan" />
          <p className="mt-4 text-sm text-text-secondary">Loading blog posts...</p>
        </SurfaceCard>
      </PageScaffold>
    )
  }

  if (blogsError) {
    return (
      <PageScaffold>
        <SurfaceCard className="flex min-h-[24rem] flex-col items-center justify-center text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-[16px] border border-danger/20 bg-danger-muted text-danger">
            <FileText size={28} strokeWidth={1.8} />
          </div>
          <h2 className="mt-5 font-display text-3xl text-text-primary">Failed to load blog posts</h2>
          <p className="mt-3 max-w-md text-sm leading-7 text-text-secondary">{blogsError}</p>
        </SurfaceCard>
      </PageScaffold>
    )
  }

  return (
    <PageScaffold>
      <div className="space-y-4">
        <PageIntro
          eyebrow="Library"
          title="Your blog catalog, operationally sharp."
          description="Filter, preview, open source files, and jump directly into edits from a single high-signal index."
          meta={
            <>
              <InfoPill>{blogs.length} posts total</InfoPill>
              <InfoPill>{featuredCount} featured</InfoPill>
            </>
          }
          actions={
            <Button variant="primary" icon={Plus} onClick={() => navigate('/dashboard/blogs/create')}>
              Create Blog
            </Button>
          }
        />

        {blogs.length === 0 ? (
          <EmptyStatePanel
            icon={FileText}
            title="No blog posts yet"
            description="Create the first story in this repository and the workspace will immediately start tracking metadata, imports, and editing flows for it."
            action={
              <Button variant="primary" icon={Plus} onClick={() => navigate('/dashboard/blogs/create')}>
                Create First Post
              </Button>
            }
          />
        ) : (
          <>
            <SurfaceCard className="overflow-hidden p-0" highlight>
              <div className="border-b border-white/8 px-3 py-2">
                <div className="grid gap-1.5 lg:grid-cols-[minmax(0,1.65fr)_minmax(0,0.78fr)_minmax(0,0.78fr)_auto]">
                  <div className="relative">
                    <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-tertiary" />
                    <input
                      type="text"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Search by title or slug..."
                      className="h-8 w-full rounded-[9px] border border-white/10 bg-white/[0.04] pl-8 pr-3 text-[12px] text-text-primary focus:border-white/18 focus:shadow-[0_0_0_3px_rgba(255,255,255,0.05)] focus:outline-none"
                    />
                  </div>

                  <div className="relative">
                    <Filter size={11} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-text-tertiary" />
                    <select
                      value={filterCategory}
                      onChange={(e) => setFilterCategory(e.target.value)}
                      className={clsx('h-8 w-full appearance-none rounded-[9px] border border-white/10 bg-white/[0.04] pl-8 pr-8 text-[12px] focus:border-white/18 focus:shadow-[0_0_0_3px_rgba(255,255,255,0.05)] focus:outline-none', !filterCategory && 'text-text-tertiary')}
                    >
                      <option value="">All Categories</option>
                      {categories.map((category) => (
                        <option key={category.slug} value={category.slug}>{category.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="relative">
                    <Filter size={11} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-text-tertiary" />
                    <select
                      value={filterAuthor}
                      onChange={(e) => setFilterAuthor(e.target.value)}
                      className={clsx('h-8 w-full appearance-none rounded-[9px] border border-white/10 bg-white/[0.04] pl-8 pr-8 text-[12px] focus:border-white/18 focus:shadow-[0_0_0_3px_rgba(255,255,255,0.05)] focus:outline-none', !filterAuthor && 'text-text-tertiary')}
                    >
                      <option value="">All Authors</option>
                      {authors.map((author) => (
                        <option key={author.slug} value={author.slug}>{author.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="flex items-center justify-end gap-1.5">
                    {hasFilters && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSearch('')
                          setFilterCategory('')
                          setFilterAuthor('')
                        }}
                      >
                        Clear
                      </Button>
                    )}
                  </div>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full table-fixed border-collapse">
                  <thead>
                    <tr className="border-b border-white/8 bg-white/[0.03]">
                      <th
                        className="w-[44%] cursor-pointer px-3 py-2.5 text-left text-[10px] font-semibold uppercase tracking-[0.18em] text-text-tertiary transition-colors duration-150 hover:text-text-primary"
                        onClick={() => handleSort('title')}
                      >
                        Title {sortKey === 'title' ? (sortDir === 'asc' ? '↑' : '↓') : '↕'}
                      </th>
                      <th className="w-[18%] px-3 py-2.5 text-left text-[10px] font-semibold uppercase tracking-[0.18em] text-text-tertiary">Author</th>
                      <th className="w-[16%] px-3 py-2.5 text-left text-[10px] font-semibold uppercase tracking-[0.18em] text-text-tertiary">Category</th>
                      <th
                        className="w-[13%] cursor-pointer px-3 py-2.5 text-left text-[10px] font-semibold uppercase tracking-[0.18em] text-text-tertiary transition-colors duration-150 hover:text-text-primary"
                        onClick={() => handleSort('date')}
                      >
                        Date {sortKey === 'date' ? (sortDir === 'asc' ? '↑' : '↓') : '↕'}
                      </th>
                      <th className="w-[9%] px-3 py-2.5 text-left text-[10px] font-semibold uppercase tracking-[0.18em] text-text-tertiary">Flags</th>
                    </tr>
                  </thead>
                  <tbody>
                    {displayBlogs.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-3 py-10 text-center text-sm text-text-tertiary">
                          No matching blog posts found
                        </td>
                      </tr>
                    ) : (
                      displayBlogs.map((blog: Blog) => {
                        const author = authorMap[blog.author]
                        const category = categoryMap[blog.category]
                        return (
                          <tr key={blog.slug} className="group border-b border-white/6 transition-colors duration-150 hover:bg-white/[0.03] last:border-0">
                            <td className="px-3 py-2.5">
                              <div className="flex items-center gap-2">
                                <div className="min-w-0 flex-1">
                                  <p className="truncate text-[13px] font-medium leading-5 text-text-primary">{blog.title}</p>
                                  <p className="mt-0.5 truncate font-mono text-[10px] leading-4 text-text-tertiary">{blog.slug}</p>
                                </div>
                                <div className="flex items-center gap-1 opacity-0 transition-opacity duration-150 group-hover:opacity-100">
                                  <button
                                    type="button"
                                    onClick={() => window.open(`http://localhost:5170/blog/post/${blog.slug}`, '_blank')}
                                    className="inline-flex h-6.5 w-6.5 items-center justify-center rounded-[8px] border border-transparent text-text-tertiary transition-all duration-150 hover:border-white/10 hover:bg-white/[0.05] hover:text-text-primary"
                                    aria-label={`Preview ${blog.title}`}
                                    title="Open local preview"
                                  >
                                    <ExternalLink size={12} strokeWidth={1.9} />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => navigate(`/dashboard/blogs/${blog.slug}/edit`)}
                                    className="inline-flex h-6.5 w-6.5 items-center justify-center rounded-[8px] border border-transparent text-text-tertiary transition-all duration-150 hover:border-white/10 hover:bg-white/[0.05] hover:text-accent"
                                    aria-label={`Edit ${blog.title}`}
                                    title="Edit blog post"
                                  >
                                    <Pencil size={12} strokeWidth={1.9} />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => window.api.openInCursor(`src/routes/blog/post/${blog.slug}/+page.markdoc`)}
                                    className="inline-flex h-6.5 w-6.5 items-center justify-center rounded-[8px] border border-transparent text-text-tertiary transition-all duration-150 hover:border-white/10 hover:bg-white/[0.05] hover:text-text-primary"
                                    aria-label={`Open ${blog.title} in Cursor`}
                                    title="Open in Cursor"
                                  >
                                    <Code size={12} strokeWidth={1.9} />
                                  </button>
                                </div>
                              </div>
                            </td>
                            <td className="px-3 py-2.5">
                              <div className="flex items-center gap-2">
                                <div className="scale-90">
                                  <AuthorAvatar src={author?.avatar && repoPath ? `file://${repoPath}/static${author.avatar}` : undefined} name={author?.name ?? blog.author} size="sm" />
                                </div>
                                <span className="truncate text-[12px] text-text-secondary">{author?.name ?? blog.author}</span>
                              </div>
                            </td>
                            <td className="px-3 py-2.5 text-[12px] capitalize text-text-secondary">{category?.name ?? blog.category}</td>
                            <td className="px-3 py-2.5 text-[12px] text-text-secondary">{formatDate(blog.date)}</td>
                            <td className="px-3 py-2.5">
                              {blog.featured ? (
                                <span className="inline-flex items-center gap-1 rounded-[8px] border border-accent/20 bg-accent-muted px-1.5 py-0.5 text-[10px] uppercase tracking-[0.1em] text-accent">
                                  <Star size={9} strokeWidth={1.8} />
                                  Live
                                </span>
                              ) : (
                                <span className="text-[10px] uppercase tracking-[0.12em] text-text-tertiary">Std</span>
                              )}
                            </td>
                          </tr>
                        )
                      })
                    )}
                  </tbody>
                </table>
              </div>
              <div className="border-t border-white/8 bg-white/[0.03] px-3 py-1.5 text-[10.5px] text-text-tertiary">
                {displayBlogs.length} {displayBlogs.length === 1 ? 'post' : 'posts'}
                {hasFilters && ` filtered from ${blogs.length}`}
              </div>
            </SurfaceCard>
          </>
        )}
      </div>
    </PageScaffold>
  )
}
