import { useMemo, useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  FileText,
  Users,
  Tag,
  FilePlus,
  UserPlus,
  Download,
  Sparkles,
  Star,
  Code,
  ArrowRight
} from 'lucide-react'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { Spinner } from '../components/ui/Spinner'
import { AuthorAvatar } from '../components/shared/AuthorAvatar'
import { useBlogs } from '../hooks/useBlogs'
import { useAuthors } from '../hooks/useAuthors'
import { useCategories } from '../hooks/useCategories'
import { InfoPill, PageIntro, PageScaffold, StatCard, SurfaceCard } from '../components/layout/PageScaffold'
import type { Author } from '../types'

function useRepoPath(): string {
  const [repoPath, setRepoPath] = useState('')
  useEffect(() => {
    window.api.getRepoPath().then(setRepoPath)
  }, [])
  return repoPath
}

function formatDate(dateStr: string): string {
  try {
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  } catch {
    return dateStr
  }
}

function QuickActionCard({
  icon: Icon,
  title,
  description,
  onClick
}: {
  icon: typeof FileText
  title: string
  description: string
  onClick: () => void
}): React.JSX.Element {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group surface-panel ambient-card flex w-full items-center gap-3 rounded-[16px] px-4 py-4 text-left transition-all duration-200 hover:-translate-y-0.5 hover:border-white/16"
    >
      <div className="flex h-10 w-10 items-center justify-center rounded-[12px] border border-white/8 bg-white/[0.04] text-cyan transition-all duration-200 group-hover:bg-cyan-muted group-hover:text-cyan">
        <Icon size={18} strokeWidth={1.9} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="font-display text-lg text-text-primary">{title}</p>
        <p className="mt-1 text-xs leading-5 text-text-secondary">{description}</p>
      </div>
      <ArrowRight size={16} className="shrink-0 text-text-tertiary transition-transform duration-200 group-hover:translate-x-1 group-hover:text-text-primary" />
    </button>
  )
}

function RecentBlogsPanel({
  blogs,
  authorMap,
  authorObjMap,
  repoPath,
  loading,
  onCreate
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
  onCreate: () => void
}): React.JSX.Element {
  const recent = blogs.slice(0, 8)

  return (
    <SurfaceCard className="overflow-hidden p-0" highlight>
      <div className="flex items-center justify-between border-b border-white/8 px-4 py-3">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-text-tertiary">Recent activity</p>
          <h2 className="mt-1 font-display text-xl text-text-primary">Latest blog work</h2>
        </div>
        <InfoPill>{blogs.length} total posts</InfoPill>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Spinner size="md" className="text-cyan" />
        </div>
      ) : recent.length === 0 ? (
        <div className="px-6 py-16 text-center">
          <h3 className="font-display text-2xl text-text-primary">No posts yet</h3>
          <p className="mx-auto mt-3 max-w-md text-sm leading-7 text-text-secondary">
            Start the publishing flow by creating the first blog post in this repository.
          </p>
          <div className="mt-6">
            <Button variant="primary" icon={FilePlus} onClick={onCreate}>
              Create First Blog Post
            </Button>
          </div>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full border-collapse">
            <thead>
              <tr className="border-b border-white/8 bg-white/[0.03]">
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.22em] text-text-tertiary">Title</th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.22em] text-text-tertiary">Author</th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.22em] text-text-tertiary">Category</th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.22em] text-text-tertiary">Published</th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.22em] text-text-tertiary">Signals</th>
              </tr>
            </thead>
            <tbody>
              {recent.map((blog) => {
                const authorName = authorMap.get(blog.author) || blog.author
                const authorObj = authorObjMap.get(blog.author)
                const avatarSrc = authorObj?.avatar && repoPath ? `file://${repoPath}/static${authorObj.avatar}` : undefined

                return (
                  <tr key={blog.slug} className="group border-b border-white/6 transition-colors duration-150 hover:bg-white/[0.03] last:border-0">
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-text-primary">{blog.title}</p>
                          <p className="mt-1 font-mono text-[11px] text-text-tertiary">{blog.slug}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => window.api.openInCursor(`src/routes/blog/post/${blog.slug}/+page.markdoc`)}
                          className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-transparent text-text-tertiary transition-all duration-150 hover:border-white/10 hover:bg-white/[0.05] hover:text-cyan"
                          title="Open in Cursor"
                        >
                          <Code size={14} strokeWidth={1.9} />
                        </button>
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-3">
                        <AuthorAvatar src={avatarSrc} name={authorName} size="sm" />
                        <span className="text-sm text-text-secondary">{authorName}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-sm capitalize text-text-secondary">{blog.category}</td>
                    <td className="px-4 py-3.5 text-sm text-text-secondary">{formatDate(blog.date)}</td>
                    <td className="px-4 py-3.5">
                      {blog.featured ? (
                        <Badge variant="accent">
                          <Star size={11} />
                          Featured
                        </Badge>
                      ) : (
                        <span className="text-xs uppercase tracking-[0.16em] text-text-tertiary">Standard</span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </SurfaceCard>
  )
}

export default function DashboardPage(): React.JSX.Element {
  const navigate = useNavigate()
  const { blogs, loading: blogsLoading } = useBlogs()
  const { authors, loading: authorsLoading } = useAuthors()
  const { categories, loading: categoriesLoading } = useCategories()
  const repoPath = useRepoPath()

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

  const featuredCount = useMemo(() => blogs.filter((blog) => blog.featured).length, [blogs])

  return (
    <PageScaffold>
      <div className="space-y-8">
        <PageIntro
          eyebrow="Control Room"
          title="Website operations at a glance."
          description="A live overview of content volume, publishing velocity, and the shortcuts your team uses most."
          meta={
            <>
              <InfoPill>{featuredCount} featured stories</InfoPill>
              <InfoPill>{blogsLoading || authorsLoading || categoriesLoading ? 'Refreshing data' : 'Repo indexed'}</InfoPill>
            </>
          }
          actions={
            <Button variant="primary" icon={FilePlus} onClick={() => navigate('/dashboard/blogs/create')}>
              Create Blog Post
            </Button>
          }
        />

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <StatCard icon={FileText} label="Posts" value={blogsLoading ? '...' : blogs.length} hint="Published and draft-ready entries." accent="accent" />
          <StatCard icon={Users} label="Authors" value={authorsLoading ? '...' : authors.length} hint="Profiles available for attribution." accent="cyan" />
          <StatCard icon={Tag} label="Categories" value={categoriesLoading ? '...' : categories.length} hint="Repository-defined taxonomy groups." accent="warning" />
          <StatCard icon={Star} label="Featured" value={blogsLoading ? '...' : featuredCount} hint="Stories promoted on high-visibility surfaces." accent="success" />
        </div>

        <div className="grid gap-3 xl:grid-cols-4">
          <QuickActionCard icon={FilePlus} title="New post" description="Create metadata and optional assets." onClick={() => navigate('/dashboard/blogs/create')} />
          <QuickActionCard icon={UserPlus} title="New author" description="Add a byline profile and avatar." onClick={() => navigate('/dashboard/authors/create')} />
          <QuickActionCard icon={Download} title="Import Notion" description="Convert an export into an existing post." onClick={() => navigate('/dashboard/import-notion')} />
          <QuickActionCard icon={Sparkles} title="Sanitize post" description="Run cleanup and formatting optimization." onClick={() => navigate('/dashboard/sanitize')} />
        </div>

        <RecentBlogsPanel blogs={blogs} authorMap={authorMap} authorObjMap={authorObjMap} repoPath={repoPath} loading={blogsLoading} onCreate={() => navigate('/dashboard/blogs/create')} />
      </div>
    </PageScaffold>
  )
}
