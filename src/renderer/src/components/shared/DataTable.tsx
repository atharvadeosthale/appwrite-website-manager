import { useMemo, useState } from 'react'
import clsx from 'clsx'
import { Search, ArrowUp, ArrowDown, ArrowUpDown } from 'lucide-react'

/* ─── Types ─── */

interface Column<T> {
  key: string
  label: string
  sortable?: boolean
  render?: (value: unknown, row: T) => React.ReactNode
}

interface DataTableProps<T extends Record<string, unknown>> {
  columns: Column<T>[]
  data: T[]
  searchKeys?: string[]
  onRowClick?: (row: T) => void
}

type SortDir = 'asc' | 'desc'

/* ─── Component ─── */

export function DataTable<T extends Record<string, unknown>>({
  columns,
  data,
  searchKeys = [],
  onRowClick
}: DataTableProps<T>): React.JSX.Element {
  const [search, setSearch] = useState('')
  const [sortKey, setSortKey] = useState<string | null>(null)
  const [sortDir, setSortDir] = useState<SortDir>('asc')

  const handleSort = (key: string): void => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDir('asc')
    }
  }

  const filtered = useMemo(() => {
    if (!search.trim() || searchKeys.length === 0) return data
    const query = search.toLowerCase()
    return data.filter((row) =>
      searchKeys.some((key) => {
        const val = row[key]
        return val != null && String(val).toLowerCase().includes(query)
      })
    )
  }, [data, search, searchKeys])

  const sorted = useMemo(() => {
    if (!sortKey) return filtered
    return [...filtered].sort((a, b) => {
      const aVal = a[sortKey]
      const bVal = b[sortKey]
      if (aVal == null && bVal == null) return 0
      if (aVal == null) return 1
      if (bVal == null) return -1

      const aStr = String(aVal).toLowerCase()
      const bStr = String(bVal).toLowerCase()
      const cmp = aStr.localeCompare(bStr, undefined, { numeric: true })
      return sortDir === 'asc' ? cmp : -cmp
    })
  }, [filtered, sortKey, sortDir])

  return (
    <div className="rounded-lg border border-border-primary bg-bg-elevated overflow-hidden">
      {/* Search bar */}
      {searchKeys.length > 0 && (
        <div className="px-4 py-3 border-b border-border-primary">
          <div className="relative max-w-xs">
            <Search
              size={15}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary"
            />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search..."
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
      )}

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border-primary bg-bg-secondary/50">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={clsx(
                    'px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase tracking-wide',
                    col.sortable && 'cursor-pointer select-none hover:text-text-primary transition-colors duration-150'
                  )}
                  onClick={col.sortable ? () => handleSort(col.key) : undefined}
                >
                  <span className="inline-flex items-center gap-1.5">
                    {col.label}
                    {col.sortable && (
                      <span className="text-text-tertiary">
                        {sortKey === col.key ? (
                          sortDir === 'asc' ? (
                            <ArrowUp size={13} />
                          ) : (
                            <ArrowDown size={13} />
                          )
                        ) : (
                          <ArrowUpDown size={13} />
                        )}
                      </span>
                    )}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="px-4 py-10 text-center text-sm text-text-tertiary"
                >
                  {search ? 'No matching results' : 'No data available'}
                </td>
              </tr>
            ) : (
              sorted.map((row, rowIndex) => (
                <tr
                  key={rowIndex}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                  className={clsx(
                    'border-b border-border-primary/60 last:border-0',
                    'transition-colors duration-100',
                    onRowClick
                      ? 'cursor-pointer hover:bg-bg-hover active:bg-bg-tertiary'
                      : 'hover:bg-bg-secondary/30'
                  )}
                >
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      className="px-4 py-3 text-sm text-text-primary"
                    >
                      {col.render
                        ? col.render(row[col.key], row)
                        : row[col.key] != null
                          ? String(row[col.key])
                          : '\u2014'}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Footer info */}
      <div className="px-4 py-2.5 border-t border-border-primary bg-bg-secondary/30">
        <p className="text-xs text-text-tertiary">
          {sorted.length} {sorted.length === 1 ? 'item' : 'items'}
          {search && ` matching "${search}"`}
        </p>
      </div>
    </div>
  )
}
