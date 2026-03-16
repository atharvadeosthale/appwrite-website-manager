import { useEffect, useMemo, useRef, useState } from 'react'
import clsx from 'clsx'
import { ChevronDown, Search, Check } from 'lucide-react'
import { AuthorAvatar } from './AuthorAvatar'
import type { Author } from '../../types'

interface AuthorDropdownProps {
  authors: Author[]
  repoPath: string
  value: string
  onChange: (slug: string) => void
  error?: string
  compact?: boolean
}

export function AuthorDropdown({
  authors,
  repoPath,
  value,
  onChange,
  error,
  compact = false
}: AuthorDropdownProps): React.JSX.Element {
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
    <div ref={containerRef} className="relative z-[90]">
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
              {!compact && <p className="mt-1 truncate text-xs text-text-tertiary">{selectedAuthor.role}</p>}
            </div>
          </>
        ) : (
          <div className="flex-1">
            <p className="text-sm font-medium text-text-primary">Select an author</p>
            {!compact && <p className="mt-1 text-xs text-text-tertiary">Search by name or slug</p>}
          </div>
        )}
        <ChevronDown size={16} className={clsx('shrink-0 text-text-tertiary transition-transform duration-200', isOpen && 'rotate-180')} />
      </button>

      {isOpen && (
        <div className="absolute left-0 right-0 top-full z-[140] mt-2 overflow-hidden rounded-[18px] border border-white/10 bg-[linear-gradient(180deg,rgba(26,26,30,0.98),rgba(12,12,14,0.98))] shadow-[0_24px_70px_rgba(3,7,18,0.38)] animate-scale-in">
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
