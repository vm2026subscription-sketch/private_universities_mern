import { useState, useMemo } from 'react';
import { Search, ChevronLeft, ChevronRight } from 'lucide-react';

export default function DataTable({
  data = [],
  columns = [],
  searchFields = [],
  searchPlaceholder = 'Search...',
  actions,
  pageSize = 10,
  emptyMessage = 'No data found',
  filters
}) {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    if (!search || !searchFields.length) return data;
    const q = search.toLowerCase();
    return data.filter(item =>
      searchFields.some(field => {
        const val = field.split('.').reduce((obj, key) => obj?.[key], item);
        return String(val || '').toLowerCase().includes(q);
      })
    );
  }, [data, search, searchFields]);

  const totalPages = Math.ceil(filtered.length / pageSize);
  const paged = filtered.slice((page - 1) * pageSize, page * pageSize);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-light-muted" />
          <input
            type="text"
            placeholder={searchPlaceholder}
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            className="input-field pl-9 !py-2 text-sm"
          />
        </div>
        {filters}
      </div>

      <div className="overflow-x-auto rounded-xl border border-light-border dark:border-dark-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-light-card dark:bg-dark-card border-b border-light-border dark:border-dark-border">
              {columns.map(col => (
                <th key={col.key} className="px-4 py-3 text-left font-medium text-light-muted dark:text-dark-muted whitespace-nowrap">
                  {col.label}
                </th>
              ))}
              {actions && <th className="px-4 py-3 text-right font-medium text-light-muted">Actions</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-light-border dark:divide-dark-border">
            {paged.length === 0 ? (
              <tr>
                <td colSpan={columns.length + (actions ? 1 : 0)} className="px-4 py-8 text-center text-light-muted">
                  {emptyMessage}
                </td>
              </tr>
            ) : paged.map((item, i) => (
              <tr key={item._id || i} className="hover:bg-light-card/50 dark:hover:bg-dark-card/50 transition-colors">
                {columns.map(col => (
                  <td key={col.key} className="px-4 py-3 whitespace-nowrap">
                    {col.render ? col.render(item) : String(col.key.split('.').reduce((obj, key) => obj?.[key], item) ?? '')}
                  </td>
                ))}
                {actions && (
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      {actions(item)}
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-light-muted">{filtered.length} items · Page {page} of {totalPages}</span>
          <div className="flex gap-1">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="p-1.5 rounded-lg hover:bg-light-card dark:hover:bg-dark-card disabled:opacity-30">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="p-1.5 rounded-lg hover:bg-light-card dark:hover:bg-dark-card disabled:opacity-30">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
