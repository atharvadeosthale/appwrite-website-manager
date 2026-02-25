import { useState, useMemo, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Plus, Github, Linkedin, ExternalLink, Users } from 'lucide-react'
import { useAuthors } from '../hooks/useAuthors'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { AuthorAvatar } from '../components/shared/AuthorAvatar'
import { Spinner } from '../components/ui/Spinner'
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
      className="inline-flex items-center justify-center w-8 h-8 rounded-full
        text-text-tertiary hover:text-accent hover:bg-accent-muted
        transition-all duration-200 cursor-pointer"
      onClick={(e) => e.stopPropagation()}
    >
      {children}
    </a>
  )
}

function AuthorCard({ author, repoPath }: { author: Author; repoPath: string }): React.JSX.Element {
  const hasSocials = author.twitter || author.github || author.linkedin

  return (
    <Card className="flex flex-col items-center text-center gap-4 p-6 group relative">
      {/* Preview link */}
      <button
        type="button"
        onClick={() => window.open(`http://localhost:5170/blog/author/${author.slug}`, '_blank')}
        className="absolute top-3 right-3 inline-flex items-center justify-center w-7 h-7 rounded-md
          text-text-tertiary hover:text-accent hover:bg-accent-muted
          opacity-0 group-hover:opacity-100
          transition-all duration-200 cursor-pointer"
        aria-label={`Preview ${author.name}`}
        title="Open local preview"
      >
        <ExternalLink size={14} strokeWidth={2} />
      </button>

      {/* Avatar */}
      <div className="relative">
        <AuthorAvatar src={getAvatarSrc(author, repoPath)} name={author.name} size="lg" />
        <div
          className="absolute inset-0 rounded-full ring-2 ring-transparent
            group-hover:ring-accent/20 transition-all duration-300"
        />
      </div>

      {/* Name and Role */}
      <div className="space-y-1 min-w-0 w-full">
        <h3 className="text-sm font-semibold text-text-primary truncate">
          {author.name}
        </h3>
        <p className="text-xs text-text-secondary truncate">
          {author.role}
        </p>
      </div>

      {/* Social Links */}
      {hasSocials && (
        <div className="flex items-center gap-1">
          <SocialLink href={author.twitter} label={`${author.name} on X / Twitter`}>
            <span className="text-xs font-bold leading-none" style={{ fontFamily: 'system-ui' }}>
              &#x1D54F;
            </span>
          </SocialLink>
          <SocialLink href={author.github} label={`${author.name} on GitHub`}>
            <Github size={15} strokeWidth={2} />
          </SocialLink>
          <SocialLink href={author.linkedin} label={`${author.name} on LinkedIn`}>
            <Linkedin size={15} strokeWidth={2} />
          </SocialLink>
        </div>
      )}

      {/* Bio */}
      {author.bio && (
        <p className="text-xs text-text-secondary leading-relaxed line-clamp-2 w-full">
          {author.bio}
        </p>
      )}
    </Card>
  )
}

function EmptyState(): React.JSX.Element {
  const navigate = useNavigate()

  return (
    <div className="flex flex-col items-center justify-center py-20 animate-fade-in">
      <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-accent-muted mb-6">
        <Users size={28} className="text-accent" />
      </div>
      <h3 className="text-lg font-semibold text-text-primary mb-2">
        No authors yet
      </h3>
      <p className="text-sm text-text-secondary mb-6 max-w-xs text-center leading-relaxed">
        Authors appear on blog posts and give your content a personal touch. Add your first one to get started.
      </p>
      <Button
        variant="primary"
        icon={Plus}
        onClick={() => navigate('/dashboard/authors/create')}
      >
        Create Your First Author
      </Button>
    </div>
  )
}

function SearchEmptyState({ query }: { query: string }): React.JSX.Element {
  return (
    <div className="flex flex-col items-center justify-center py-16 animate-fade-in">
      <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-bg-secondary mb-4">
        <Search size={20} className="text-text-tertiary" />
      </div>
      <h3 className="text-sm font-medium text-text-primary mb-1">
        No results for &ldquo;{query}&rdquo;
      </h3>
      <p className="text-xs text-text-secondary">
        Try a different search term or check the spelling.
      </p>
    </div>
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
    return authors.filter(
      (author) =>
        author.name.toLowerCase().includes(query) ||
        author.role.toLowerCase().includes(query)
    )
  }, [authors, searchQuery])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="flex flex-col items-center gap-3 animate-fade-in">
          <Spinner size="lg" />
          <p className="text-sm text-text-secondary">Loading authors...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-8 animate-fade-in">
        <div className="flex flex-col items-center justify-center py-16">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-danger-muted mb-4">
            <ExternalLink size={20} className="text-danger" />
          </div>
          <h3 className="text-sm font-medium text-text-primary mb-1">
            Could not load authors
          </h3>
          <p className="text-xs text-text-secondary max-w-xs text-center">
            {error}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-8 animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-text-primary tracking-tight">
            Authors
          </h1>
          <p className="mt-1 text-sm text-text-secondary leading-relaxed">
            {authors.length === 0
              ? 'Add authors to attribute your blog posts.'
              : `${authors.length} author${authors.length === 1 ? '' : 's'} in your team`}
          </p>
        </div>
        {authors.length > 0 && (
          <Button
            variant="primary"
            icon={Plus}
            onClick={() => navigate('/dashboard/authors/create')}
          >
            Create Author
          </Button>
        )}
      </div>

      {/* Search Bar — only show when there are authors */}
      {authors.length > 0 && (
        <div className="relative mb-6">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary pointer-events-none"
          />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search authors by name or role..."
            className="w-full pl-9 pr-4 py-2.5 text-sm
              bg-bg-elevated border border-border-primary rounded-lg
              text-text-primary placeholder:text-text-tertiary
              hover:border-border-secondary
              focus:outline-none focus:border-accent focus:shadow-[0_0_0_3px_var(--color-accent-muted)]
              transition-all duration-200"
          />
        </div>
      )}

      {/* Content */}
      {authors.length === 0 ? (
        <EmptyState />
      ) : filteredAuthors.length === 0 ? (
        <SearchEmptyState query={searchQuery} />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredAuthors.map((author, index) => (
            <div
              key={author.slug}
              className="animate-fade-in"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <AuthorCard author={author} repoPath={repoPath} />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
