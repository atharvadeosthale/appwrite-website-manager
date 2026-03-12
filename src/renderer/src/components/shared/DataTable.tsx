import { useMemo, useState } from 'react'
import clsx from 'clsx'
import { Search, ArrowUp, ArrowDown, ArrowUpDown } from 'lucide-react'

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
      setSortDir((dir) => (dir === 'asc' ? 'desc' : 'asc'))
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
        const value = row[key]
        return value != null && String(value).toLowerCase().includes(query)
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
      const comparison = aStr.localeCompare(bStr, undefined, { numeric: true })
      return sortDir === 'asc' ? comparison : -comparison
    })
  }, [filtered, sortDir, sortKey])

  return (
    <div className="overflow-hidden rounded-[18px] border border-white/10 bg-[linear-gradient(180deg,rgba(24,24,28,0.96),rgba(12,12,14,0.98))] shadow-[0_22px_54px_rgba(0,0,0,0.26)]">
      {searchKeys.length > 0 && (
        <div className="flex flex-col gap-4 border-b border-white/8 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-text-tertiary">Search</p>
            <p className="mt-1 text-sm text-text-secondary">Filter the dataset in place.</p>
          </div>
          <div className="relative w-full max-w-sm">
            <Search size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-text-tertiary" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search..."
              className="w-full rounded-[12px] border border-white/10 bg-white/[0.04] py-2.5 pl-10 pr-4 text-sm text-text-primary focus:border-white/18 focus:shadow-[0_0_0_3px_rgba(255,255,255,0.05)] focus:outline-none"
            />
          </div>
        </div>
      )}
      <div className="overflow-x-auto">
        <table className="min-w-full border-collapse">
          <thead>
            <tr className="border-b border-white/8 bg-white/[0.03]">
              {columns.map((column) => (
                <th
                  key={column.key}
                  className={clsx(
                    'px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.22em] text-text-tertiary',
                    column.sortable && 'cursor-pointer select-none transition-colors duration-150 hover:text-text-primary'
                  )}
                  onClick={column.sortable ? () => handleSort(column.key) : undefined}
                >
                  <span className="inline-flex items-center gap-2">
                    {column.label}
                    {column.sortable && (
                      <span className="text-text-muted">
                        {sortKey === column.key ? (
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
                <td colSpan={columns.length} className="px-4 py-12 text-center text-sm text-text-tertiary">
                  {search ? 'No matching results' : 'No data available'}
                </td>
              </tr>
            ) : (
              sorted.map((row, rowIndex) => (
                <tr
                  key={rowIndex}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                  className={clsx(
                    'border-b border-white/6 last:border-0 transition-colors duration-150',
                    onRowClick ? 'cursor-pointer hover:bg-white/[0.04] active:bg-white/[0.05]' : 'hover:bg-white/[0.025]'
                  )}
                >
                  {columns.map((column) => (
                    <td key={column.key} className="px-4 py-3.5 align-top text-sm text-text-primary">
                      {column.render ? column.render(row[column.key], row) : row[column.key] != null ? String(row[column.key]) : '\u2014'}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <div className="border-t border-white/8 bg-white/[0.03] px-4 py-2.5 text-xs text-text-tertiary">
        {sorted.length} {sorted.length === 1 ? 'item' : 'items'}
        {search && ` matching "${search}"`}
      </div>
    </div>
  )
}
