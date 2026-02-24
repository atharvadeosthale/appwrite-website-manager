import { Tag, Info } from 'lucide-react'
import { DataTable } from '../components/shared/DataTable'
import { Spinner } from '../components/ui/Spinner'
import { useCategories } from '../hooks/useCategories'
import type { Category } from '../types'

/* ─── Column Definitions ─── */

const columns = [
  {
    key: 'name',
    label: 'Name',
    sortable: true,
    render: (value: unknown): React.ReactNode => (
      <span className="font-medium text-text-primary">{String(value)}</span>
    )
  },
  {
    key: 'slug',
    label: 'Slug',
    sortable: true,
    render: (value: unknown): React.ReactNode => (
      <code className="px-1.5 py-0.5 rounded bg-bg-secondary text-xs font-mono text-text-secondary">
        {String(value)}
      </code>
    )
  },
  {
    key: 'description',
    label: 'Description',
    sortable: false
  }
]

/* ─── Page ─── */

export default function CategoryListPage(): React.JSX.Element {
  const { categories, loading, error } = useCategories()

  return (
    <div className="p-8 animate-fade-in space-y-8">
      {/* Page Header */}
      <div className="flex items-start gap-4">
        <div className="flex items-center justify-center w-11 h-11 rounded-full bg-warning-muted shrink-0">
          <Tag size={20} strokeWidth={1.8} className="text-warning" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold text-text-primary tracking-tight">Categories</h1>
          <p className="mt-1.5 text-sm text-text-secondary leading-relaxed">
            All blog categories defined in the website repository.
          </p>
        </div>
      </div>

      {/* Info Banner */}
      <div className="flex items-start gap-3 p-4 rounded-lg bg-bg-secondary border border-border-primary">
        <Info size={18} className="text-text-tertiary shrink-0 mt-0.5" />
        <p className="text-sm text-text-secondary leading-relaxed">
          Categories are managed directly in the website repository. This page is read-only for
          reference.
        </p>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <Spinner size="lg" />
          <p className="text-sm text-text-tertiary">Loading categories...</p>
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center py-16 gap-2">
          <p className="text-sm text-danger">{error}</p>
        </div>
      ) : (
        <DataTable<Category & Record<string, unknown>>
          columns={columns}
          data={categories as (Category & Record<string, unknown>)[]}
          searchKeys={['name', 'slug', 'description']}
        />
      )}
    </div>
  )
}
