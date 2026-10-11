import React, { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Search } from 'lucide-react';
import { DataRow } from '../types/data';
import { hasExtraWhitespace, isBlank } from '../utils/dataEngine';

interface DataTableViewProps {
  columns: string[];
  rows: DataRow[];
  highlightRowIndices?: Set<number>;
  highlightColumns?: Set<string>;
  showWhitespaceMarkers?: boolean;
  emptyMessage?: string;
  maxHeightClass?: string;
}

export const DataTableView: React.FC<DataTableViewProps> = ({
  columns,
  rows,
  highlightRowIndices,
  highlightColumns,
  showWhitespaceMarkers = false,
  emptyMessage = 'No rows match the current filter.',
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);
  const [onlyHighlighted, setOnlyHighlighted] = useState(false);

  const indexedRows = useMemo(() => {
    return rows.map((row, idx) => ({ row, originalIndex: idx }));
  }, [rows]);

  const filteredRows = useMemo(() => {
    let list = indexedRows;
    if (onlyHighlighted && highlightRowIndices && highlightRowIndices.size > 0) {
      list = list.filter((item) => highlightRowIndices.has(item.originalIndex));
    }
    const q = searchQuery.trim().toLowerCase();
    if (!q) return list;
    return list.filter(({ row, originalIndex }) => {
      if (String(originalIndex + 1).includes(q)) return true;
      return columns.some((col) => (row[col] ?? '').toLowerCase().includes(q));
    });
  }, [indexedRows, columns, searchQuery, onlyHighlighted, highlightRowIndices]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedRows = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return filteredRows.slice(start, start + pageSize);
  }, [filteredRows, safePage, pageSize]);

  const hasRowHighlights = Boolean(highlightRowIndices && highlightRowIndices.size > 0);

  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
      {/* Table Toolbar */}
      <div className="p-4 border-b border-slate-200 bg-slate-50/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            placeholder="Search rows or values..."
            aria-label="Search rows or values"
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-sky-600 focus:ring-1 focus:ring-sky-600"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600">
          {hasRowHighlights && (
            <label className="inline-flex items-center gap-2 cursor-pointer select-none font-medium text-slate-700">
              <input
                type="checkbox"
                checked={onlyHighlighted}
                onChange={(e) => {
                  setOnlyHighlighted(e.target.checked);
                  setCurrentPage(1);
                }}
                className="rounded border-slate-300 text-sky-600 focus:ring-sky-600"
              />
              <span>Show only affected rows ({highlightRowIndices?.size ?? 0})</span>
            </label>
          )}

          <span className="font-mono tabular-nums text-slate-500">
            Showing {filteredRows.length === 0 ? 0 : (safePage - 1) * pageSize + 1}–
            {Math.min(safePage * pageSize, filteredRows.length)} of {filteredRows.length} rows
          </span>

          <select
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value));
              setCurrentPage(1);
            }}
            aria-label="Rows per page"
            className="bg-white border border-slate-300 rounded-md px-2 py-1 text-xs text-slate-700 focus:outline-none focus:border-sky-600"
          >
            <option value={10}>10 / page</option>
            <option value={15}>15 / page</option>
            <option value={25}>25 / page</option>
            <option value={50}>50 / page</option>
          </select>
        </div>
      </div>

      {/* Data Grid */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-slate-100/90 border-b border-slate-200 text-slate-700 font-semibold">
              <th className="py-2.5 px-3 w-14 text-right font-mono text-slate-500 border-r border-slate-200">
                #
              </th>
              {columns.map((col) => {
                const isColHighlighted = highlightColumns?.has(col);
                return (
                  <th
                    key={col}
                    className={`py-2.5 px-3 font-mono whitespace-nowrap border-r border-slate-200 last:border-r-0 ${
                      isColHighlighted ? 'bg-amber-100/80 text-amber-950' : ''
                    }`}
                  >
                    {showWhitespaceMarkers && col !== col.trim() ? `"${col}"` : col}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 font-mono tabular-nums">
            {paginatedRows.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length + 1}
                  className="py-10 px-4 text-center text-slate-500 font-sans"
                >
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              paginatedRows.map(({ row, originalIndex }) => {
                const isRowHighlighted = highlightRowIndices?.has(originalIndex);
                return (
                  <tr
                    key={originalIndex}
                    className={`transition-colors ${
                      isRowHighlighted
                        ? 'bg-amber-50/90 hover:bg-amber-100/70'
                        : 'hover:bg-slate-50'
                    }`}
                  >
                    <td className="py-2 px-3 text-right text-slate-400 border-r border-slate-200 select-none">
                      {originalIndex + 1}
                    </td>
                    {columns.map((col) => {
                      const val = row[col] ?? '';
                      const blank = isBlank(val);
                      const extraWs = hasExtraWhitespace(val);
                      const isColHighlighted = highlightColumns?.has(col);

                      return (
                        <td
                          key={col}
                          className={`py-2 px-3 whitespace-nowrap border-r border-slate-100 last:border-r-0 ${
                            isColHighlighted && isRowHighlighted
                              ? 'bg-amber-200/50 font-medium text-slate-950'
                              : isColHighlighted
                              ? 'bg-amber-50/50'
                              : ''
                          }`}
                        >
                          {blank ? (
                            <span className="text-rose-600 italic font-sans text-[11px]">
                              (Blank)
                            </span>
                          ) : showWhitespaceMarkers && extraWs ? (
                            <span className="bg-amber-100 text-amber-900 px-1 py-0.5 rounded">
                              {JSON.stringify(val)}
                            </span>
                          ) : (
                            <span className="text-slate-800">{val}</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      {totalPages > 1 && (
        <div className="px-4 py-2.5 border-t border-slate-200 bg-slate-50/70 flex items-center justify-between text-xs text-slate-600">
          <div className="font-mono tabular-nums">
            Page {safePage} of {totalPages}
          </div>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              disabled={safePage <= 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:pointer-events-none cursor-pointer"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span>Previous</span>
            </button>
            <button
              type="button"
              disabled={safePage >= totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:pointer-events-none cursor-pointer"
            >
              <span>Next</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
