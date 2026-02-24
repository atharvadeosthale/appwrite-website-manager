import { useState, useRef, useEffect, useMemo } from 'react'
import clsx from 'clsx'
import { Search, ChevronDown, FileText, X } from 'lucide-react'
import type { Blog } from '../../types'

interface BlogSelectorProps {
  blogs: Blog[]
  loading?: boolean
  selected: Blog | null
  onSelect: (blog: Blog | null) => void
  label?: string
  placeholder?: string
}

function formatDate(dateStr: string): string {
  try {
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  } catch {
    return dateStr
  }
}

export function BlogSelector({
  blogs,
  loading = false,
  selected,
  onSelect,
  label = 'Select a blog post',
  placeholder = 'Search by title or slug...'
}: BlogSelectorProps): React.JSX.Element {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent): void {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Focus search input when dropdown opens
  useEffect(() => {
    if (open && inputRef.current) {
      inputRef.current.focus()
    }
  }, [open])

  const filtered = useMemo(() => {
    if (!search.trim()) return blogs
    const query = search.toLowerCase()
    return blogs.filter(
      (blog) =>
        blog.title.toLowerCase().includes(query) ||
        blog.slug.toLowerCase().includes(query)
    )
  }, [blogs, search])

  const handleSelect = (blog: Blog): void => {
    onSelect(blog)
    setOpen(false)
    setSearch('')
  }

  const handleClear = (): void => {
    onSelect(null)
    setSearch('')
  }

  return (
    <div className="flex flex-col gap-1.5" ref={containerRef}>
      {label && (
        <label className="text-sm font-medium text-text-primary select-none">
          {label}
        </label>
      )}

      {/* Trigger button */}
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={clsx(
          'w-full flex items-center gap-3 text-left',
          'bg-bg-elevated rounded-md',
          'border px-3 py-2.5 text-sm',
          'transition-all duration-200',
          'cursor-pointer',
          open
            ? 'border-accent shadow-[0_0_0_3px_var(--color-accent-muted)]'
            : 'border-border-primary hover:border-border-secondary',
          'focus:outline-none focus:border-accent focus:shadow-[0_0_0_3px_var(--color-accent-muted)]'
        )}
      >
        {selected ? (
          <div className="flex-1 flex items-center gap-3 min-w-0">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-accent-muted shrink-0">
              <FileText size={15} className="text-accent" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-text-primary truncate">{selected.title}</p>
              <p className="text-xs text-text-tertiary truncate">
                {selected.slug} &middot; {formatDate(selected.date)}
              </p>
            </div>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                handleClear()
              }}
              className="shrink-0 p-1 rounded-sm text-text-tertiary hover:text-text-secondary hover:bg-bg-hover transition-colors duration-150 cursor-pointer"
              aria-label="Clear selection"
            >
              <X size={14} />
            </button>
          </div>
        ) : (
          <span className="flex-1 text-text-tertiary">Choose a blog post...</span>
        )}
        <ChevronDown
          size={16}
          className={clsx(
            'shrink-0 text-text-tertiary transition-transform duration-200',
            open && 'rotate-180'
          )}
        />
      </button>

      {/* Dropdown */}
      {open && (
        <div
          className={clsx(
            'relative z-20',
            'bg-bg-elevated rounded-lg',
            'border border-border-primary',
            'shadow-lg',
            'overflow-hidden',
            'animate-scale-in'
          )}
        >
          {/* Search input */}
          <div className="p-2.5 border-b border-border-primary">
            <div className="relative">
              <Search
                size={15}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary"
              />
              <input
                ref={inputRef}
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={placeholder}
                className={clsx(
                  'w-full pl-9 pr-3 py-2',
                  'text-sm bg-bg-secondary rounded-md',
                  'border border-border-primary',
                  'focus:outline-none focus:border-accent focus:shadow-[0_0_0_3px_var(--color-accent-muted)]',
                  'placeholder:text-text-tertiary',
                  'transition-all duration-200'
                )}
              />
            </div>
          </div>

          {/* Options list */}
          <div className="max-h-64 overflow-y-auto">
            {loading ? (
              <div className="px-4 py-8 text-center">
                <span className="inline-block h-5 w-5 border-2 border-accent border-r-transparent rounded-full animate-spin" />
                <p className="mt-2 text-xs text-text-tertiary">Loading blog posts...</p>
              </div>
            ) : filtered.length === 0 ? (
              <div className="px-4 py-8 text-center">
                <p className="text-sm text-text-tertiary">
                  {search ? 'No matching blog posts' : 'No blog posts available'}
                </p>
              </div>
            ) : (
              filtered.map((blog) => {
                const isSelected = selected?.slug === blog.slug
                return (
                  <button
                    key={blog.slug}
                    type="button"
                    onClick={() => handleSelect(blog)}
                    className={clsx(
                      'w-full flex items-center gap-3 px-3 py-2.5 text-left',
                      'transition-colors duration-100',
                      'cursor-pointer',
                      isSelected
                        ? 'bg-accent-muted'
                        : 'hover:bg-bg-hover active:bg-bg-tertiary'
                    )}
                  >
                    <div className={clsx(
                      'flex items-center justify-center w-8 h-8 rounded-lg shrink-0',
                      isSelected ? 'bg-accent/10' : 'bg-bg-tertiary'
                    )}>
                      <FileText
                        size={15}
                        className={isSelected ? 'text-accent' : 'text-text-tertiary'}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={clsx(
                        'text-sm truncate',
                        isSelected ? 'font-semibold text-accent' : 'font-medium text-text-primary'
                      )}>
                        {blog.title}
                      </p>
                      <p className="text-xs text-text-tertiary truncate">
                        {blog.slug} &middot; {formatDate(blog.date)}
                      </p>
                    </div>
                  </button>
                )
              })
            )}
          </div>

          {/* Footer count */}
          {!loading && (
            <div className="px-3 py-2 border-t border-border-primary bg-bg-secondary/30">
              <p className="text-xs text-text-tertiary">
                {filtered.length} {filtered.length === 1 ? 'post' : 'posts'}
                {search && ` matching "${search}"`}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
