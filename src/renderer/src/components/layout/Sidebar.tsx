import { useLocation, useNavigate } from 'react-router-dom'
import clsx from 'clsx'
import { useRefreshKey } from '../../hooks/useRefreshKey'
import {
  LayoutDashboard,
  FileText,
  Users,
  Tag,
  FilePlus,
  UserPlus,
  Download,
  Sparkles,
  FolderOpen
} from 'lucide-react'
import { Toggle } from '../ui/Toggle'
import { useDevServer } from '../../hooks/useDevServer'

interface NavItem {
  label: string
  path: string
  icon: typeof LayoutDashboard
}

const contentNav: NavItem[] = [
  { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
  { label: 'Blog Posts', path: '/dashboard/blogs', icon: FileText },
  { label: 'Authors', path: '/dashboard/authors', icon: Users },
  { label: 'Categories', path: '/dashboard/categories', icon: Tag }
]

const toolsNav: NavItem[] = [
  { label: 'Create Blog', path: '/dashboard/blogs/create', icon: FilePlus },
  { label: 'Create Author', path: '/dashboard/authors/create', icon: UserPlus },
  { label: 'Import Notion', path: '/dashboard/import-notion', icon: Download },
  { label: 'Sanitize', path: '/dashboard/sanitize', icon: Sparkles }
]

function NavSection({
  title,
  items,
  currentPath,
  onNavigate
}: {
  title: string
  items: NavItem[]
  currentPath: string
  onNavigate: (path: string) => void
}): React.JSX.Element {
  return (
    <div className="mb-2">
      <h3 className="px-4 py-2 text-[10px] font-semibold uppercase tracking-wider text-text-tertiary">
        {title}
      </h3>
      <nav className="flex flex-col gap-0.5 px-2">
        {items.map((item) => {
          const isActive =
            item.path === '/dashboard'
              ? currentPath === '/dashboard'
              : currentPath.startsWith(item.path)
          const Icon = item.icon
          return (
            <button
              key={item.path}
              type="button"
              onClick={() => onNavigate(item.path)}
              className={clsx(
                'flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium',
                'transition-all duration-150 cursor-pointer',
                'text-left w-full',
                isActive
                  ? 'bg-accent-muted text-accent'
                  : 'text-text-secondary hover:bg-bg-hover hover:text-text-primary'
              )}
            >
              <Icon size={18} strokeWidth={1.8} />
              <span>{item.label}</span>
            </button>
          )
        })}
      </nav>
    </div>
  )
}

export function Sidebar(): React.JSX.Element {
  const location = useLocation()
  const navigate = useNavigate()
  const { running, starting, start, stop } = useDevServer()
  const { refresh } = useRefreshKey()

  const handleNavigate = (path: string): void => {
    navigate(path)
  }

  const handleChangeRepo = async (): Promise<void> => {
    try {
      const path = await window.api.selectFolder()
      if (!path) return

      const result = await window.api.validateRepo(path)
      if (!result.valid) {
        alert(result.error ?? 'Not a valid Appwrite website repository.')
        return
      }

      await window.api.setRepoPath(path)
      refresh()
      navigate('/dashboard', { replace: true })
    } catch {
      alert('Something went wrong selecting the folder.')
    }
  }

  return (
    <aside
      className={clsx(
        'flex flex-col w-60 h-full',
        'bg-bg-secondary border-r border-border-primary',
        'select-none'
      )}
    >
      {/* App title */}
      <div className="flex items-center gap-2.5 px-5 py-5 border-b border-border-primary">
        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-accent-muted">
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-accent"
            />
          </svg>
        </div>
        <div>
          <h1 className="text-sm font-semibold text-text-primary leading-tight">
            Website Manager
          </h1>
          <p className="text-[10px] text-text-tertiary leading-tight">Appwrite</p>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex-1 overflow-y-auto py-4">
        <NavSection
          title="Content"
          items={contentNav}
          currentPath={location.pathname}
          onNavigate={handleNavigate}
        />
        <NavSection
          title="Tools"
          items={toolsNav}
          currentPath={location.pathname}
          onNavigate={handleNavigate}
        />
      </div>

      {/* Bottom section */}
      <div className="border-t border-border-primary p-4 space-y-3">
        {/* Dev server toggle */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span
              className={clsx(
                'inline-block w-2 h-2 rounded-full',
                running ? 'bg-success' : 'bg-text-tertiary'
              )}
            />
            <span className="text-xs text-text-secondary font-medium">Dev Server</span>
          </div>
          <Toggle checked={running} onChange={running ? () => stop() : () => start()} disabled={starting} />
        </div>

        {/* Repo path + change */}
        <button
          type="button"
          onClick={handleChangeRepo}
          className={clsx(
            'flex items-center gap-2 w-full px-2 py-1.5 rounded-md',
            'text-xs text-text-tertiary',
            'hover:bg-bg-hover hover:text-text-secondary',
            'transition-colors duration-150 cursor-pointer',
            'text-left'
          )}
          title="Change repository folder"
        >
          <FolderOpen size={14} className="shrink-0" />
          <span className="truncate">Change Repo</span>
        </button>
      </div>
    </aside>
  )
}
