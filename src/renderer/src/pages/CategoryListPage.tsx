import { Tag, Info } from 'lucide-react'
import { DataTable } from '../components/shared/DataTable'
import { Spinner } from '../components/ui/Spinner'
import { useCategories } from '../hooks/useCategories'
import { InfoPill, PageIntro, PageScaffold, SurfaceCard } from '../components/layout/PageScaffold'
import type { Category } from '../types'

const columns = [
  {
    key: 'name',
    label: 'Name',
    sortable: true,
    render: (value: unknown): React.ReactNode => <span className="font-medium text-text-primary">{String(value)}</span>
  },
  {
    key: 'slug',
    label: 'Slug',
    sortable: true,
    render: (value: unknown): React.ReactNode => <code className="muted-code">{String(value)}</code>
  },
  {
    key: 'description',
    label: 'Description',
    sortable: false
  }
]

export default function CategoryListPage(): React.JSX.Element {
  const { categories, loading, error } = useCategories()

  return (
    <PageScaffold>
      <div className="space-y-8">
        <PageIntro
          eyebrow="Taxonomy"
          title="Repository categories, mapped cleanly."
          description="A read-only reference of the category definitions currently sourced from the website repository."
          meta={<InfoPill>{loading ? 'Loading categories' : `${categories.length} categories loaded`}</InfoPill>}
        />

        <SurfaceCard className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-cyan/20 bg-cyan-muted text-cyan">
            <Info size={20} strokeWidth={1.8} />
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-text-tertiary">Read only</p>
            <h2 className="mt-2 font-display text-2xl text-text-primary">Managed in the repo</h2>
            <p className="mt-2 text-sm leading-7 text-text-secondary">
              Categories are authored directly inside the website codebase. This screen mirrors the current source of truth for quick inspection.
            </p>
          </div>
        </SurfaceCard>

        {loading ? (
          <SurfaceCard className="flex flex-col items-center justify-center py-16">
            <Spinner size="lg" className="text-cyan" />
            <p className="mt-4 text-sm text-text-secondary">Loading categories...</p>
          </SurfaceCard>
        ) : error ? (
          <SurfaceCard className="flex flex-col items-center justify-center py-16 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-danger/20 bg-danger-muted text-danger">
              <Tag size={24} strokeWidth={1.8} />
            </div>
            <p className="mt-4 text-sm font-medium text-danger">Failed to load categories</p>
            <p className="mt-2 max-w-md text-sm leading-7 text-text-secondary">{error}</p>
          </SurfaceCard>
        ) : (
          <DataTable<Category & Record<string, unknown>> columns={columns} data={categories as (Category & Record<string, unknown>)[]} searchKeys={['name', 'slug', 'description']} />
        )}
      </div>
    </PageScaffold>
  )
}
