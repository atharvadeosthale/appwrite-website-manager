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

  useEffect(() => {
    function handleClickOutside(e: MouseEvent): void {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    if (open && inputRef.current) {
      inputRef.current.focus()
    }
  }, [open])

  const filtered = useMemo(() => {
    if (!search.trim()) return blogs
    const query = search.toLowerCase()
    return blogs.filter((blog) => blog.title.toLowerCase().includes(query) || blog.slug.toLowerCase().includes(query))
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
    <div className="flex flex-col gap-2" ref={containerRef}>
      {label && <label className="text-xs font-medium uppercase tracking-[0.18em] text-text-tertiary">{label}</label>}
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className={clsx(
          'w-full rounded-[12px] border px-4 py-2.5 text-left transition-all duration-200',
          'bg-[linear-gradient(180deg,rgba(24,24,28,0.94),rgba(15,15,18,0.9))]',
          open ? 'border-white/18 shadow-[0_0_0_3px_rgba(255,255,255,0.05)]' : 'border-white/10 hover:border-white/18'
        )}
      >
        <div className="flex items-center gap-3">
          {selected ? (
            <>
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/8 bg-accent-muted text-accent">
                <FileText size={18} strokeWidth={1.8} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-text-primary">{selected.title}</p>
                <p className="truncate text-xs text-text-tertiary">{selected.slug} • {formatDate(selected.date)}</p>
              </div>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  handleClear()
                }}
                className="rounded-xl p-2 text-text-tertiary transition-colors duration-150 hover:bg-white/[0.05] hover:text-text-primary"
                aria-label="Clear selection"
              >
                <X size={14} />
              </button>
            </>
          ) : (
            <>
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-dashed border-white/12 bg-white/[0.04] text-text-secondary">
                <FileText size={18} strokeWidth={1.8} />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-text-primary">Choose a blog post</p>
                <p className="text-xs text-text-tertiary">Search title, slug, or publish date</p>
              </div>
            </>
          )}
          <ChevronDown size={18} className={clsx('shrink-0 text-text-tertiary transition-transform duration-200', open && 'rotate-180')} />
        </div>
      </button>

      {open && (
        <div className="relative z-20 overflow-hidden rounded-[16px] border border-white/10 bg-[linear-gradient(180deg,rgba(26,26,30,0.98),rgba(12,12,14,0.98))] shadow-[0_24px_70px_rgba(3,7,18,0.38)] animate-scale-in">
          <div className="border-b border-white/8 p-3">
            <div className="relative">
              <Search size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-text-tertiary" />
              <input
                ref={inputRef}
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={placeholder}
                className="w-full rounded-[12px] border border-white/10 bg-white/[0.04] py-2.5 pl-10 pr-4 text-sm text-text-primary focus:border-white/18 focus:shadow-[0_0_0_3px_rgba(255,255,255,0.05)] focus:outline-none"
              />
            </div>
          </div>
          <div className="max-h-72 overflow-y-auto p-2">
            {loading ? (
              <div className="px-4 py-10 text-center text-sm text-text-secondary">Loading blog posts...</div>
            ) : filtered.length === 0 ? (
              <div className="px-4 py-10 text-center text-sm text-text-tertiary">
                {search ? 'No matching blog posts' : 'No blog posts available'}
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
                      'flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left transition-colors duration-150',
                      isSelected ? 'bg-accent-muted/90' : 'hover:bg-white/[0.05]'
                    )}
                  >
                    <div className={clsx('flex h-10 w-10 items-center justify-center rounded-2xl border border-white/8', isSelected ? 'bg-accent/12 text-accent' : 'bg-white/[0.04] text-text-secondary')}>
                      <FileText size={16} strokeWidth={1.8} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className={clsx('truncate text-sm font-medium', isSelected ? 'text-accent' : 'text-text-primary')}>
                        {blog.title}
                      </p>
                      <p className="truncate text-xs text-text-tertiary">{blog.slug} • {formatDate(blog.date)}</p>
                    </div>
                  </button>
                )
              })
            )}
          </div>
          {!loading && (
            <div className="border-t border-white/8 bg-white/[0.03] px-4 py-3 text-xs text-text-tertiary">
              {filtered.length} {filtered.length === 1 ? 'post' : 'posts'}
              {search && ` matching "${search}"`}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
