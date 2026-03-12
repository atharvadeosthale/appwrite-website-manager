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

  const filtered = branches.filter((branch) => branch.toLowerCase().includes(search.toLowerCase()))

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

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => searchInputRef.current?.focus(), 50)
    }
  }, [isOpen])

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
      <button
        type="button"
        onClick={() => setIsOpen((currentOpen) => !currentOpen)}
        disabled={loading}
        className={clsx(
          'inline-flex min-h-9 items-center gap-2 rounded-[12px] border border-white/10 bg-white/[0.04] px-3.5 text-sm text-text-primary transition-all duration-200',
          'hover:border-white/16 hover:bg-white/[0.06] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/20',
          'disabled:cursor-not-allowed disabled:opacity-60'
        )}
      >
        <GitBranch size={15} className="text-text-secondary" />
        <span className="max-w-[180px] truncate font-mono text-xs text-text-primary">{current}</span>
        {loading ? <Spinner size="sm" className="text-text-tertiary" /> : <ChevronDown size={14} className={clsx('text-text-tertiary transition-transform duration-200', isOpen && 'rotate-180')} />}
      </button>

      {isOpen && (
        <div className="absolute bottom-full left-0 z-40 mb-2 w-72 overflow-hidden rounded-[16px] border border-white/10 bg-[linear-gradient(180deg,rgba(26,26,30,0.98),rgba(12,12,14,0.98))] shadow-[0_22px_60px_rgba(3,7,18,0.42)] animate-scale-in">
          <div className="border-b border-white/8 p-3">
            <div className="relative">
              <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-text-tertiary" />
              <input
                ref={searchInputRef}
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Find a branch..."
                className="w-full rounded-[12px] border border-white/10 bg-white/[0.04] py-2.5 pl-10 pr-4 text-sm text-text-primary focus:border-white/18 focus:shadow-[0_0_0_3px_rgba(255,255,255,0.05)] focus:outline-none"
              />
            </div>
          </div>
          <div className="max-h-60 overflow-y-auto p-2">
            {filtered.length === 0 ? (
              <div className="px-3 py-6 text-center text-xs text-text-tertiary">No branches found</div>
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
                      'flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left text-sm transition-colors duration-150',
                      isCurrent ? 'bg-accent-muted text-accent' : 'text-text-primary hover:bg-white/[0.05]'
                    )}
                  >
                    <span className="flex h-8 w-8 items-center justify-center rounded-xl border border-white/8 bg-white/[0.04]">
                      {isCurrent ? <Check size={14} className="text-accent" /> : <GitBranch size={14} className="text-text-tertiary" />}
                    </span>
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
