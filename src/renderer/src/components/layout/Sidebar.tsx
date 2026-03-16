import { useLocation, useNavigate } from 'react-router-dom'
import clsx from 'clsx'
import { useRefreshKey } from '../../hooks/useRefreshKey'
import {
  LayoutDashboard,
  FileText,
  Users,
  Tag,
  FilePlus,
  Layers,
  UserPlus,
  Download,
  Sparkles,
  FolderOpen,
  Wand2,
  ExternalLink
} from 'lucide-react'
import { Toggle } from '../ui/Toggle'
import { useDevServer } from '../../hooks/useDevServer'
import { useCoverAudit } from '../../hooks/useCoverAudit'

interface NavItem {
  label: string
  path: string
  icon: typeof LayoutDashboard
  badgeCount?: number
}

const contentNav: NavItem[] = [
  {
    label: 'Overview',
    path: '/dashboard',
    icon: LayoutDashboard
  },
  {
    label: 'Blog Library',
    path: '/dashboard/blogs',
    icon: FileText
  },
  {
    label: 'Authors',
    path: '/dashboard/authors',
    icon: Users
  },
  {
    label: 'Categories',
    path: '/dashboard/categories',
    icon: Tag
  }
]

function NavSection({
  title,
  badge,
  items,
  currentPath,
  onNavigate
}: {
  title: string
  badge: string
  items: NavItem[]
  currentPath: string
  onNavigate: (path: string) => void
}): React.JSX.Element {
  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between px-1">
        <h3 className="text-[11px] font-semibold uppercase tracking-[0.2em] text-text-tertiary">{title}</h3>
        <span className="rounded-[10px] border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.16em] text-text-tertiary">
          {badge}
        </span>
      </div>
      <div className="space-y-2">
        {items.map((item) => {
          const isActive = item.path === '/dashboard' ? currentPath === '/dashboard' : currentPath.startsWith(item.path)
          const Icon = item.icon
          return (
            <button
              key={item.path}
              type="button"
              onClick={() => onNavigate(item.path)}
              className={clsx(
                'group flex w-full items-center gap-3 rounded-[12px] border px-3 py-2.5 text-left transition-all duration-200',
                isActive
                  ? 'border-white/14 bg-white/[0.06] shadow-[inset_0_1px_0_rgba(255,255,255,0.04),0_14px_28px_rgba(0,0,0,0.18)]'
                  : 'border-transparent bg-transparent hover:border-white/8 hover:bg-white/[0.04]'
              )}
            >
              <div
                className={clsx(
                  'flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] border transition-all duration-200',
                  isActive
                    ? 'border-white/10 bg-white/[0.08] text-text-primary'
                    : 'border-white/8 bg-white/[0.04] text-text-secondary group-hover:text-text-primary'
                )}
              >
                <Icon size={16} strokeWidth={1.9} />
              </div>
              <div className="min-w-0">
                <p className={clsx('text-sm font-medium', isActive ? 'text-text-primary' : 'text-text-secondary group-hover:text-text-primary')}>
                  {item.label}
                </p>
              </div>
              {item.badgeCount && item.badgeCount > 0 && (
                <span className="ml-auto inline-flex min-h-5 min-w-5 items-center justify-center rounded-full border border-warning/25 bg-warning-muted px-1.5 text-[10px] font-semibold text-warning">
                  {item.badgeCount}
                </span>
              )}
            </button>
          )
        })}
      </div>
    </section>
  )
}

export function Sidebar(): React.JSX.Element {
  const location = useLocation()
  const navigate = useNavigate()
  const { running, starting, stopping, start, stop } = useDevServer()
  const { missingCoverCount } = useCoverAudit()
  const { refresh } = useRefreshKey()

  const toolsNav: NavItem[] = [
    {
      label: 'Create Blog',
      path: '/dashboard/blogs/create',
      icon: FilePlus
    },
    {
      label: 'Bulk Generation',
      path: '/dashboard/bulk-generation',
      icon: Layers,
      badgeCount: missingCoverCount
    },
    {
      label: 'Create Author',
      path: '/dashboard/authors/create',
      icon: UserPlus
    },
    {
      label: 'Import Notion',
      path: '/dashboard/import-notion',
      icon: Download
    },
    {
      label: 'Sanitize',
      path: '/dashboard/sanitize',
      icon: Sparkles
    }
  ]

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

  const previewLabel = starting ? 'Booting' : stopping ? 'Stopping' : running ? 'Live' : 'Offline'

  return (
    <aside className="relative flex h-full w-[15.5rem] shrink-0 flex-col border-r border-white/8 bg-[linear-gradient(180deg,rgba(8,8,10,0.98),rgba(11,11,13,0.96))] px-3 py-3 backdrop-blur-3xl">
      <div className="pointer-events-none absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-white/12 to-transparent" />

      <div className="glass-panel rounded-[18px] px-4 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-[12px] border border-accent/18 bg-accent-muted text-accent shadow-[0_14px_26px_rgba(255,92,143,0.14)]">
            <Wand2 size={18} strokeWidth={2} />
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-text-tertiary">Appwrite</p>
            <h1 className="font-display text-xl text-text-primary">Website Manager</h1>
          </div>
        </div>
      </div>

      <div className="mt-5 flex-1 overflow-y-auto pr-1">
        <div className="space-y-6 pb-4">
          <NavSection title="Workspace" badge="Core" items={contentNav} currentPath={location.pathname} onNavigate={handleNavigate} />
          <NavSection title="Tools" badge="Build" items={toolsNav} currentPath={location.pathname} onNavigate={handleNavigate} />
        </div>
      </div>

      <div className="space-y-3 pt-4">
        <div className="surface-panel rounded-[16px] px-4 py-4">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-medium text-text-primary">Preview</p>
            <Toggle
              checked={running}
              onChange={(checked) => (checked ? start() : stop())}
              disabled={starting || stopping}
            />
          </div>
          <div className="mt-3 flex items-center justify-between rounded-[12px] border border-white/8 bg-white/[0.04] px-3 py-2 text-[11px]">
            <span className="inline-flex items-center gap-2 text-text-secondary">
              <span
                className={clsx(
                  'h-2.5 w-2.5 rounded-full',
                  starting || stopping
                    ? 'bg-warning animate-glow-pulse'
                    : running
                      ? 'bg-success animate-glow-pulse'
                      : 'bg-text-tertiary'
                )}
              />
              {previewLabel}
            </span>
            <button
              type="button"
              onClick={() => window.open('http://localhost:5170', '_blank')}
              className="inline-flex h-7 w-7 items-center justify-center rounded-[10px] border border-white/8 bg-white/[0.04] text-text-secondary transition-colors duration-150 hover:text-text-primary"
              title="Open preview in browser"
            >
              <ExternalLink size={13} strokeWidth={1.9} />
            </button>
          </div>
        </div>

        <button
          type="button"
          onClick={handleChangeRepo}
          className="surface-panel inline-flex w-full items-center justify-center gap-2 rounded-[12px] px-4 py-2.5 text-sm font-medium text-text-primary transition-all duration-200 hover:-translate-y-0.5 hover:border-white/16"
          title="Change repository folder"
        >
          <FolderOpen size={15} strokeWidth={1.9} />
          Switch Repository
        </button>
      </div>
    </aside>
  )
}
