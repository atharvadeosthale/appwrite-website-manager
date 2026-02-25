import { useMemo, useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { FileText, Users, Tag, FilePlus, UserPlus, Download, Sparkles, Star, Code } from 'lucide-react'
import { Card } from '../components/ui/Card'
import { Badge } from '../components/ui/Badge'
import { Spinner } from '../components/ui/Spinner'
import { AuthorAvatar } from '../components/shared/AuthorAvatar'
import { useBlogs } from '../hooks/useBlogs'
import { useAuthors } from '../hooks/useAuthors'
import { useCategories } from '../hooks/useCategories'
import type { Author } from '../types'

function useRepoPath(): string {
  const [repoPath, setRepoPath] = useState('')
  useEffect(() => {
    window.api.getRepoPath().then(setRepoPath)
  }, [])
  return repoPath
}

/* ─── Stat Card ─── */

function StatCard({
  icon: Icon,
  iconBg,
  iconColor,
  count,
  label,
  loading
}: {
  icon: typeof FileText
  iconBg: string
  iconColor: string
  count: number
  label: string
  loading: boolean
}): React.JSX.Element {
  return (
    <Card>
      <div className="flex items-center gap-4">
        <div className={`flex items-center justify-center w-11 h-11 rounded-full ${iconBg}`}>
          <Icon size={20} strokeWidth={1.8} className={iconColor} />
        </div>
        <div>
          {loading ? (
            <Spinner size="sm" />
          ) : (
            <p className="text-2xl font-semibold text-text-primary tracking-tight">{count}</p>
          )}
          <p className="text-xs text-text-secondary mt-0.5">{label}</p>
        </div>
      </div>
    </Card>
  )
}

/* ─── Quick Action Card ─── */

function QuickActionCard({
  icon: Icon,
  label,
  onClick
}: {
  icon: typeof FileText
  label: string
  onClick: () => void
}): React.JSX.Element {
  return (
    <Card onClick={onClick} className="group">
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-bg-tertiary group-hover:bg-accent-muted transition-colors duration-200">
          <Icon
            size={18}
            strokeWidth={1.8}
            className="text-text-secondary group-hover:text-accent transition-colors duration-200"
          />
        </div>
        <span className="text-sm font-medium text-text-primary">{label}</span>
      </div>
    </Card>
  )
}

/* ─── Recent Blog Posts Table ─── */

function RecentBlogsTable({
  blogs,
  authorMap,
  authorObjMap,
  repoPath,
  loading
}: {
  blogs: Array<{
    slug: string
    title: string
    author: string
    category: string
    date: string
    featured: boolean
  }>
  authorMap: Map<string, string>
  authorObjMap: Map<string, Author>
  repoPath: string
  loading: boolean
}): React.JSX.Element {
  const recent = blogs.slice(0, 10)

  return (
    <div className="rounded-lg border border-border-primary bg-bg-elevated overflow-hidden">
      {/* Header */}
      <div className="px-5 py-3.5 border-b border-border-primary">
        <h3 className="text-sm font-semibold text-text-primary">Recent Blog Posts</h3>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Spinner size="md" />
        </div>
      ) : recent.length === 0 ? (
        <div className="px-5 py-12 text-center">
          <p className="text-sm text-text-tertiary">No blog posts yet. Create your first one!</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border-primary bg-bg-secondary/50">
                <th className="px-5 py-3 text-left text-xs font-semibold text-text-secondary uppercase tracking-wide">
                  Title
                </th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-text-secondary uppercase tracking-wide">
                  Author
                </th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-text-secondary uppercase tracking-wide">
                  Category
                </th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-text-secondary uppercase tracking-wide">
                  Date
                </th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-text-secondary uppercase tracking-wide">
                  Featured
                </th>
              </tr>
            </thead>
            <tbody>
              {recent.map((blog) => {
                const authorName = authorMap.get(blog.author) || blog.author
                const authorObj = authorObjMap.get(blog.author)
                const avatarSrc = authorObj?.avatar && repoPath ? `file://${repoPath}/static${authorObj.avatar}` : undefined

                return (
                  <tr
                    key={blog.slug}
                    className="group border-b border-border-primary/60 last:border-0 hover:bg-bg-secondary/30 transition-colors duration-100"
                  >
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-text-primary font-medium truncate max-w-[280px]">
                          {blog.title}
                        </span>
                        <button
                          type="button"
                          onClick={() => window.api.openInCursor(`src/routes/blog/post/${blog.slug}/+page.markdoc`)}
                          className="shrink-0 inline-flex items-center justify-center w-6 h-6 rounded-md
                            text-text-tertiary hover:text-accent hover:bg-accent-muted
                            opacity-0 group-hover:opacity-100
                            transition-all duration-200 cursor-pointer"
                          title="Open in Cursor"
                        >
                          <Code size={13} strokeWidth={2} />
                        </button>
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <AuthorAvatar src={avatarSrc} name={authorName} size="sm" />
                        <span className="text-sm text-text-secondary">{authorName}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-sm text-text-secondary capitalize">
                      {blog.category}
                    </td>
                    <td className="px-5 py-3 text-sm text-text-secondary whitespace-nowrap">
                      {formatDate(blog.date)}
                    </td>
                    <td className="px-5 py-3">
                      {blog.featured && (
                        <Badge variant="accent">
                          <Star size={11} className="mr-1" />
                          Featured
                        </Badge>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Footer */}
      {!loading && recent.length > 0 && (
        <div className="px-5 py-2.5 border-t border-border-primary bg-bg-secondary/30">
          <p className="text-xs text-text-tertiary">
            Showing {recent.length} of {blogs.length} posts
          </p>
        </div>
      )}
    </div>
  )
}

/* ─── Helper ─── */

function formatDate(dateStr: string): string {
  try {
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  } catch {
    return dateStr
  }
}

/* ─── Dashboard Page ─── */

export default function DashboardPage(): React.JSX.Element {
  const navigate = useNavigate()
  const { blogs, loading: blogsLoading } = useBlogs()
  const { authors, loading: authorsLoading } = useAuthors()
  const { categories, loading: categoriesLoading } = useCategories()

  const repoPath = useRepoPath()

  // Build maps for author slug -> name and slug -> full author object
  const authorMap = useMemo(() => {
    const map = new Map<string, string>()
    for (const author of authors) {
      map.set(author.slug, author.name)
    }
    return map
  }, [authors])

  const authorObjMap = useMemo(() => {
    const map = new Map<string, Author>()
    for (const author of authors) {
      map.set(author.slug, author)
    }
    return map
  }, [authors])

  return (
    <div className="p-8 animate-fade-in space-y-8">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-semibold text-text-primary tracking-tight">Dashboard</h1>
        <p className="mt-1.5 text-sm text-text-secondary leading-relaxed">
          Welcome back! Here is an overview of your website content.
        </p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-3 gap-5">
        <StatCard
          icon={FileText}
          iconBg="bg-accent-muted"
          iconColor="text-accent"
          count={blogs.length}
          label="Total Blog Posts"
          loading={blogsLoading}
        />
        <StatCard
          icon={Users}
          iconBg="bg-success-muted"
          iconColor="text-success"
          count={authors.length}
          label="Total Authors"
          loading={authorsLoading}
        />
        <StatCard
          icon={Tag}
          iconBg="bg-warning-muted"
          iconColor="text-warning"
          count={categories.length}
          label="Total Categories"
          loading={categoriesLoading}
        />
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-sm font-semibold text-text-primary mb-3">Quick Actions</h2>
        <div className="grid grid-cols-4 gap-4">
          <QuickActionCard
            icon={FilePlus}
            label="New Blog Post"
            onClick={() => navigate('/dashboard/blogs/create')}
          />
          <QuickActionCard
            icon={UserPlus}
            label="New Author"
            onClick={() => navigate('/dashboard/authors/create')}
          />
          <QuickActionCard
            icon={Download}
            label="Import from Notion"
            onClick={() => navigate('/dashboard/import-notion')}
          />
          <QuickActionCard
            icon={Sparkles}
            label="Sanitize Blog"
            onClick={() => navigate('/dashboard/sanitize')}
          />
        </div>
      </div>

      {/* Recent Blog Posts */}
      <RecentBlogsTable blogs={blogs} authorMap={authorMap} authorObjMap={authorObjMap} repoPath={repoPath} loading={blogsLoading} />
    </div>
  )
}
