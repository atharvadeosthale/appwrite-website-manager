import { useState, useMemo, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Plus, Github, Linkedin, ExternalLink, Users } from 'lucide-react'
import { useAuthors } from '../hooks/useAuthors'
import { Button } from '../components/ui/Button'
import { AuthorAvatar } from '../components/shared/AuthorAvatar'
import { Spinner } from '../components/ui/Spinner'
import { EmptyStatePanel, InfoPill, PageIntro, PageScaffold, SurfaceCard } from '../components/layout/PageScaffold'
import type { Author } from '../types'

function useRepoPath(): string {
  const [repoPath, setRepoPath] = useState('')
  useEffect(() => {
    window.api.getRepoPath().then(setRepoPath)
  }, [])
  return repoPath
}

function getAvatarSrc(author: Author, repoPath: string): string | undefined {
  if (!author.avatar || !repoPath) return undefined
  return `file://${repoPath}/static${author.avatar}`
}

function SocialLink({ href, label, children }: { href: string; label: string; children: React.ReactNode }): React.JSX.Element | null {
  if (!href) return null

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={label}
      className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-white/8 bg-white/[0.04] text-text-tertiary transition-all duration-150 hover:border-white/14 hover:text-text-primary"
      onClick={(e) => e.stopPropagation()}
    >
      {children}
    </a>
  )
}

function AuthorCard({ author, repoPath }: { author: Author; repoPath: string }): React.JSX.Element {
  const hasSocials = author.twitter || author.github || author.linkedin

  return (
    <SurfaceCard className="group relative flex h-full flex-col gap-5 p-5" highlight>
      <button
        type="button"
        onClick={() => window.open(`http://localhost:5170/blog/author/${author.slug}`, '_blank')}
        className="absolute right-4 top-4 inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-white/8 bg-white/[0.04] text-text-tertiary opacity-0 transition-all duration-200 hover:border-white/14 hover:text-cyan group-hover:opacity-100"
        aria-label={`Preview ${author.name}`}
        title="Open local preview"
      >
        <ExternalLink size={16} strokeWidth={1.9} />
      </button>

      <div className="flex items-center gap-4">
        <AuthorAvatar src={getAvatarSrc(author, repoPath)} name={author.name} size="lg" />
        <div className="min-w-0">
          <h3 className="truncate font-display text-2xl text-text-primary">{author.name}</h3>
          <p className="mt-1 text-sm text-text-secondary">{author.role}</p>
          <p className="mt-2 font-mono text-[11px] uppercase tracking-[0.18em] text-text-tertiary">{author.slug}</p>
        </div>
      </div>

      {author.bio && <p className="text-sm leading-7 text-text-secondary">{author.bio}</p>}

      {hasSocials && (
        <div className="mt-auto flex items-center gap-2 pt-2">
          <SocialLink href={author.twitter} label={`${author.name} on X / Twitter`}>
            <span className="text-xs font-bold leading-none" style={{ fontFamily: 'system-ui' }}>
              &#x1D54F;
            </span>
          </SocialLink>
          <SocialLink href={author.github} label={`${author.name} on GitHub`}>
            <Github size={16} strokeWidth={2} />
          </SocialLink>
          <SocialLink href={author.linkedin} label={`${author.name} on LinkedIn`}>
            <Linkedin size={16} strokeWidth={2} />
          </SocialLink>
        </div>
      )}
    </SurfaceCard>
  )
}

export default function AuthorListPage(): React.JSX.Element {
  const { authors, loading, error } = useAuthors()
  const [searchQuery, setSearchQuery] = useState('')
  const navigate = useNavigate()
  const repoPath = useRepoPath()

  const filteredAuthors = useMemo(() => {
    if (!searchQuery.trim()) return authors
    const query = searchQuery.toLowerCase().trim()
    return authors.filter((author) => author.name.toLowerCase().includes(query) || author.role.toLowerCase().includes(query))
  }, [authors, searchQuery])

  if (loading) {
    return (
      <PageScaffold>
        <SurfaceCard className="flex min-h-[24rem] flex-col items-center justify-center">
          <Spinner size="lg" className="text-cyan" />
          <p className="mt-4 text-sm text-text-secondary">Loading authors...</p>
        </SurfaceCard>
      </PageScaffold>
    )
  }

  if (error) {
    return (
      <PageScaffold>
        <SurfaceCard className="flex min-h-[24rem] flex-col items-center justify-center text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-[16px] border border-danger/20 bg-danger-muted text-danger">
            <Users size={28} strokeWidth={1.8} />
          </div>
          <h2 className="mt-5 font-display text-3xl text-text-primary">Could not load authors</h2>
          <p className="mt-3 max-w-md text-sm leading-7 text-text-secondary">{error}</p>
        </SurfaceCard>
      </PageScaffold>
    )
  }

  return (
    <PageScaffold>
      <div className="space-y-8">
        <PageIntro
          eyebrow="Team"
          title="Publishing identities with presence."
          description="Manage the bylines, roles, bios, and linked profiles that shape every story across the site."
          meta={<InfoPill>{authors.length} author{authors.length === 1 ? '' : 's'} loaded</InfoPill>}
          actions={
            <Button variant="primary" icon={Plus} onClick={() => navigate('/dashboard/authors/create')}>
              Create Author
            </Button>
          }
        />

        {authors.length > 0 && (
          <SurfaceCard className="p-4 sm:p-5">
            <div className="relative">
              <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-text-tertiary" />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search authors by name or role..."
                className="w-full rounded-[12px] border border-white/10 bg-white/[0.04] py-2.5 pl-10 pr-4 text-sm text-text-primary focus:border-white/18 focus:shadow-[0_0_0_3px_rgba(255,255,255,0.05)] focus:outline-none"
              />
            </div>
          </SurfaceCard>
        )}

        {authors.length === 0 ? (
          <EmptyStatePanel
            icon={Users}
            title="No authors yet"
            description="Authors create trust on the frontend and keep attribution consistent across your content system. Add the first one to start publishing with a real team profile."
            action={
              <Button variant="primary" icon={Plus} onClick={() => navigate('/dashboard/authors/create')}>
                Create First Author
              </Button>
            }
          />
        ) : filteredAuthors.length === 0 ? (
          <SurfaceCard className="flex flex-col items-center justify-center py-16 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] text-text-secondary">
              <Search size={24} strokeWidth={1.8} />
            </div>
            <h2 className="mt-4 font-display text-3xl text-text-primary">No results for “{searchQuery}”</h2>
            <p className="mt-3 text-sm leading-7 text-text-secondary">Try a different name, role, or partial match.</p>
          </SurfaceCard>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {filteredAuthors.map((author, index) => (
              <div key={author.slug} className="animate-fade-in" style={{ animationDelay: `${index * 45}ms` }}>
                <AuthorCard author={author} repoPath={repoPath} />
              </div>
            ))}
          </div>
        )}
      </div>
    </PageScaffold>
  )
}
