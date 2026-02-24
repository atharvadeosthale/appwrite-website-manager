import { useEffect, useRef, useState } from 'react'
import clsx from 'clsx'
import { GitBranch, ChevronDown, Search, Check } from 'lucide-react'
import { Spinner } from '../ui/Spinner'

interface BranchSelectorProps {
  current: string
  branches: string[]
  onSwitch: (branch: string) => void
  loading?: boolean
}

export function BranchSelector({
  current,
  branches,
  onSwitch,
  loading = false
}: BranchSelectorProps): React.JSX.Element {
  const [isOpen, setIsOpen] = useState(false)
  const [search, setSearch] = useState('')
  const containerRef = useRef<HTMLDivElement>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)

  const filtered = branches.filter((b) =>
    b.toLowerCase().includes(search.toLowerCase())
  )

  // Close dropdown on outside click
  useEffect(() => {
    if (!isOpen) return
    const handleClick = (e: MouseEvent): void => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false)
        setSearch('')
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [isOpen])

  // Focus search input when dropdown opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => searchInputRef.current?.focus(), 50)
    }
  }, [isOpen])

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') {
        setIsOpen(false)
        setSearch('')
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen])

  return (
    <div ref={containerRef} className="relative inline-block">
      {/* Trigger button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        disabled={loading}
        className={clsx(
          'inline-flex items-center gap-2 px-3 py-2',
          'bg-bg-elevated border border-border-primary rounded-md',
          'text-sm text-text-primary',
          'hover:border-border-secondary hover:bg-bg-hover',
          'transition-all duration-200',
          'cursor-pointer',
          'focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2',
          'disabled:opacity-60 disabled:cursor-not-allowed'
        )}
      >
        <GitBranch size={15} className="text-text-secondary shrink-0" />
        <span className="truncate max-w-[160px] font-medium">{current}</span>
        {loading ? (
          <Spinner size="sm" className="text-text-tertiary" />
        ) : (
          <ChevronDown
            size={14}
            className={clsx(
              'text-text-tertiary transition-transform duration-200',
              isOpen && 'rotate-180'
            )}
          />
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div
          className={clsx(
            'absolute bottom-full left-0 mb-1.5 z-40',
            'w-64',
            'bg-bg-elevated rounded-md shadow-lg',
            'border border-border-primary',
            'overflow-hidden',
            'animate-scale-in'
          )}
        >
          {/* Search */}
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
                placeholder="Find a branch..."
                className={clsx(
                  'w-full pl-8 pr-3 py-1.5',
                  'text-sm bg-bg-secondary rounded-sm',
                  'border-none',
                  'focus:outline-none focus:ring-0',
                  'placeholder:text-text-tertiary'
                )}
              />
            </div>
          </div>

          {/* Branch list */}
          <div className="max-h-52 overflow-y-auto py-1">
            {filtered.length === 0 ? (
              <div className="px-3 py-4 text-center text-xs text-text-tertiary">
                No branches found
              </div>
            ) : (
              filtered.map((branch) => {
                const isCurrent = branch === current
                return (
                  <button
                    key={branch}
                    type="button"
                    onClick={() => {
                      if (!isCurrent) onSwitch(branch)
                      setIsOpen(false)
                      setSearch('')
                    }}
                    className={clsx(
                      'w-full flex items-center gap-2 px-3 py-2',
                      'text-sm text-left',
                      'transition-colors duration-100',
                      'cursor-pointer',
                      isCurrent
                        ? 'bg-accent-muted text-accent font-medium'
                        : 'text-text-primary hover:bg-bg-hover'
                    )}
                  >
                    {isCurrent ? (
                      <Check size={14} className="shrink-0 text-accent" />
                    ) : (
                      <span className="w-3.5 shrink-0" />
                    )}
                    <span className="truncate font-mono text-xs">{branch}</span>
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
