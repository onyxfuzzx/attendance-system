import React from 'react';
import { ChevronLeft, ChevronRight, Search } from 'lucide-react';

interface Column<T> {
  header: string;
  accessor: keyof T | ((item: T) => React.ReactNode);
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  total: number;
  limit: number;
  offset: number;
  onPageChange: (newOffset: number) => void;
  onSearch?: (term: string) => void;
  isLoading?: boolean;
}

export function DataTable<T>({
  columns,
  data,
  total,
  limit,
  offset,
  onPageChange,
  onSearch,
  isLoading
}: DataTableProps<T>) {
  const currentPage = Math.floor(offset / limit) + 1;
  const totalPages = Math.ceil(total / limit);

  return (
    <div className="bg-surface rounded-xl border border-outline/30 overflow-hidden shadow-midnight">
      {onSearch && (
        <div className="p-4 border-b border-outline/20 bg-primary-dark">
          <div className="relative max-w-sm">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-on-surface-variant/40 w-4 h-4" />
            <input
              type="text"
              placeholder="Search records..."
              className="pl-10 pr-4 py-2.5 w-full rounded-lg border border-outline/30 bg-surface focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500/30 text-sm text-on-surface placeholder:text-on-surface-variant/30 transition-all"
              onChange={(e) => onSearch(e.target.value)}
            />
          </div>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="bg-primary-dark text-on-surface-variant/60 uppercase text-[10px] font-bold tracking-widest">
            <tr>
              {columns.map((col, idx) => (
                <th key={idx} className="px-6 py-4 border-b border-outline/20">
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-outline/10 bg-surface">
            {isLoading ? (
              [...Array(limit)].map((_, i) => (
                <tr key={i} className="animate-pulse">
                  {columns.map((_, j) => (
                    <td key={j} className="px-6 py-4">
                      <div className="h-4 bg-amber-500/5 rounded w-full"></div>
                    </td>
                  ))}
                </tr>
              ))
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-6 py-12 text-center text-on-surface-variant/40 italic">
                  No records found
                </td>
              </tr>
            ) : (
              data.map((item, idx) => (
                <tr key={idx} className="hover:bg-amber-500/[0.02] transition-colors">
                  {columns.map((col, j) => (
                    <td key={j} className="px-6 py-4 whitespace-nowrap text-on-surface">
                      {typeof col.accessor === 'function'
                        ? col.accessor(item)
                        : (item[col.accessor] as React.ReactNode)}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="p-4 border-t border-outline/20 flex items-center justify-between bg-primary-dark">
        <span className="text-[10px] font-bold text-on-surface-variant/40 uppercase tracking-widest">
          Showing {offset + 1} to {Math.min(offset + limit, total)} of {total} results
        </span>
        <div className="flex items-center gap-3">
          <button
            onClick={() => onPageChange(Math.max(0, offset - limit))}
            disabled={currentPage === 1 || isLoading}
            className="p-1.5 rounded-lg hover:bg-amber-500/8 disabled:opacity-30 disabled:cursor-not-allowed border border-outline/20 bg-surface text-on-surface transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-xs font-bold text-amber-500">
            Page {currentPage} of {totalPages || 1}
          </span>
          <button
            onClick={() => onPageChange(offset + limit)}
            disabled={currentPage === totalPages || totalPages === 0 || isLoading}
            className="p-1.5 rounded-lg hover:bg-amber-500/8 disabled:opacity-30 disabled:cursor-not-allowed border border-outline/20 bg-surface text-on-surface transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}