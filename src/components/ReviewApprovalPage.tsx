import React, { useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Edit3,
  Sliders,
  XCircle,
} from 'lucide-react';
import { CleaningPreviewResult, PageId, SessionDatasetRecord } from '../types/data';
import { DataTableView } from './DataTableView';

interface ReviewApprovalPageProps {
  activeDataset: SessionDatasetRecord | null;
  previewResult: CleaningPreviewResult | null;
  onApproveAndClean: () => void;
  onEditInstructions: () => void;
  onCancelReview: () => void;
  onNavigate: (page: PageId) => void;
}

export const ReviewApprovalPage: React.FC<ReviewApprovalPageProps> = ({
  activeDataset,
  previewResult,
  onApproveAndClean,
  onEditInstructions,
  onCancelReview,
  onNavigate,
}) => {
  const [previewTab, setPreviewTab] = useState<'diff' | 'after' | 'before'>('diff');

  if (!activeDataset || !previewResult) {
    return (
      <div className="bg-white border border-slate-200 rounded-xl p-10 text-center space-y-4">
        <h1 className="text-xl font-bold text-slate-900 font-display">
          No Pending Cleaning Plan to Review
        </h1>
        <p className="text-sm text-slate-600 max-w-md mx-auto">
          Submit custom cleaning instructions first so DataTrustAI can simulate the proposed
          changes and generate a before-and-after diff preview.
        </p>
        <button
          type="button"
          onClick={() => onNavigate('instructions')}
          className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
        >
          <Sliders className="w-4 h-4" />
          <span>Go to Custom Instructions</span>
        </button>
      </div>
    );
  }

  const changedColumns = previewResult.columnChanges.filter(
    (c) => c.changeType !== 'unchanged'
  );

  return (
    <div className="space-y-8">
      {/* Header & Three Required Action Buttons */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-6 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 font-display">
            Review &amp; Approval Gate
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Inspect the simulated impact on{' '}
            <span className="font-semibold text-slate-900">{activeDataset.fileName}</span> before
            committing changes. Original uploaded data remains preserved for undo.
          </p>
        </div>

        {/* Three Required Action Buttons: Approve and Clean, Edit Instructions, Cancel */}
        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={onCancelReview}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 text-sm font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <XCircle className="w-4 h-4 text-slate-500" />
            <span>Cancel</span>
          </button>

          <button
            type="button"
            onClick={onEditInstructions}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 text-sm font-semibold text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Edit3 className="w-4 h-4" />
            <span>Edit Instructions</span>
          </button>

          <button
            type="button"
            onClick={onApproveAndClean}
            className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-teal-600 hover:bg-teal-700 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Approve and Clean</span>
          </button>
        </div>
      </div>

      {/* Warnings about Potentially Destructive Operations */}
      {previewResult.destructiveWarnings.length > 0 && (
        <div
          role="alert"
          className="bg-amber-50 border border-amber-200 rounded-xl p-5 space-y-2 text-amber-950"
        >
          <div className="flex items-center gap-2 font-bold text-sm font-display">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>Warnings About Potentially Destructive Operations</span>
          </div>
          <ul className="list-disc list-inside text-xs text-amber-900 space-y-1">
            {previewResult.destructiveWarnings.map((warn, idx) => (
              <li key={idx}>{warn}</li>
            ))}
          </ul>
          <p className="text-[11px] text-amber-800 pt-1">
            Note: Your original uploaded dataset is preserved in session memory so you can undo or
            reset at any time from Change History.
          </p>
        </div>
      )}

      {/* Impact Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-1">
          <div className="text-xs text-slate-500">Proposed Operations</div>
          <div className="text-2xl font-bold text-slate-900 font-mono tabular-nums">
            {previewResult.operations.length}
          </div>
          <div className="text-xs text-slate-500">Deterministic rule steps</div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-1">
          <div className="text-xs text-slate-500">Number of Affected Rows</div>
          <div className="text-2xl font-bold text-sky-700 font-mono tabular-nums">
            {previewResult.totalAffectedRows.toLocaleString()}
          </div>
          <div className="text-xs text-slate-500 font-mono tabular-nums">
            Row count: {previewResult.beforeRows.length} &rarr; {previewResult.afterRows.length}
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-1">
          <div className="text-xs text-slate-500">Number of Affected Cells</div>
          <div className="text-2xl font-bold text-teal-700 font-mono tabular-nums">
            {previewResult.totalAffectedCells.toLocaleString()}
          </div>
          <div className="text-xs text-slate-500">
            Modified values &amp; replacements
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-1">
          <div className="text-xs text-slate-500">Column Header Changes</div>
          <div className="text-2xl font-bold text-slate-900 font-mono tabular-nums">
            {changedColumns.length}
          </div>
          <div className="text-xs text-slate-500 font-mono tabular-nums">
            Columns: {previewResult.beforeColumns.length} &rarr; {previewResult.afterColumns.length}
          </div>
        </div>
      </div>

      {/* Proposed Cleaning Operations Breakdown */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
        <h2 className="text-base font-bold text-slate-900 font-display">
          Proposed Cleaning Operations Breakdown
        </h2>
        <div className="overflow-x-auto border border-slate-200 rounded-lg">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                <th className="py-2.5 px-4 w-12">#</th>
                <th className="py-2.5 px-4">Operation</th>
                <th className="py-2.5 px-4">Description</th>
                <th className="py-2.5 px-4 text-right font-mono">Affected Rows</th>
                <th className="py-2.5 px-4 text-right font-mono">Affected Cells</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {previewResult.operationMetrics.map((m, idx) => (
                <tr key={m.operationId} className="hover:bg-slate-50">
                  <td className="py-2.5 px-4 font-mono text-slate-400">{idx + 1}</td>
                  <td className="py-2.5 px-4 font-semibold text-slate-900">{m.title}</td>
                  <td className="py-2.5 px-4 text-slate-600">{m.description}</td>
                  <td className="py-2.5 px-4 text-right font-mono tabular-nums font-semibold text-slate-900">
                    {m.affectedRowsCount}
                  </td>
                  <td className="py-2.5 px-4 text-right font-mono tabular-nums font-semibold text-slate-900">
                    {m.affectedCellsCount}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Before-and-After Preview Section */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
          <div>
            <h2 className="text-base font-bold text-slate-900 font-display">
              Before-and-After Data Preview
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Compare exact cell changes, removed rows, and resulting table structure before
              approval
            </p>
          </div>

          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg shrink-0">
            <button
              type="button"
              onClick={() => setPreviewTab('diff')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                previewTab === 'diff'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Cell &amp; Schema Diffs ({previewResult.cellDiffs.length + previewResult.removedRows.length})
            </button>
            <button
              type="button"
              onClick={() => setPreviewTab('after')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                previewTab === 'after'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              After Cleaning ({previewResult.afterRows.length} rows)
            </button>
            <button
              type="button"
              onClick={() => setPreviewTab('before')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                previewTab === 'before'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Before Cleaning ({previewResult.beforeRows.length} rows)
            </button>
          </div>
        </div>

        {previewTab === 'diff' && (
          <div className="space-y-6">
            {/* Column Header Diffs */}
            {changedColumns.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-xs font-bold text-slate-700">
                  Column Header Modifications ({changedColumns.length})
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 font-mono text-xs">
                  {changedColumns.map((col, i) => (
                    <div
                      key={i}
                      className="p-2.5 rounded-lg border border-slate-200 bg-slate-50 flex items-center justify-between gap-2"
                    >
                      <span className="text-rose-700 truncate">&quot;{col.beforeName}&quot;</span>
                      <ArrowRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      {col.changeType === 'removed' ? (
                        <span className="text-rose-600 font-semibold">(Removed Empty Col)</span>
                      ) : (
                        <span className="text-teal-700 font-semibold truncate">
                          &quot;{col.afterName}&quot;
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Cell Value Diffs */}
            <div className="space-y-2">
              <h3 className="text-xs font-bold text-slate-700">
                Cell-Level Before &rarr; After Changes ({previewResult.cellDiffs.length})
              </h3>
              {previewResult.cellDiffs.length === 0 ? (
                <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-500">
                  No individual cell values were modified (only row/column structural operations
                  or no matching cells found).
                </div>
              ) : (
                <div className="overflow-x-auto border border-slate-200 rounded-lg max-h-64">
                  <table className="w-full text-left border-collapse text-xs font-mono tabular-nums">
                    <thead>
                      <tr className="bg-slate-100 border-b border-slate-200 text-slate-700 sticky top-0">
                        <th className="py-2 px-3 w-20">Row #</th>
                        <th className="py-2 px-3">Column</th>
                        <th className="py-2 px-3">Before Value</th>
                        <th className="py-2 px-3">After Value</th>
                        <th className="py-2 px-3 font-sans">Applied Rule</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {previewResult.cellDiffs.slice(0, 100).map((diff, idx) => (
                        <tr key={idx} className="hover:bg-slate-50">
                          <td className="py-2 px-3 text-slate-500">#{diff.rowIndex + 1}</td>
                          <td className="py-2 px-3 font-semibold text-slate-900">{diff.column}</td>
                          <td className="py-2 px-3 text-rose-800 bg-rose-50/60">
                            {JSON.stringify(diff.beforeValue)}
                          </td>
                          <td className="py-2 px-3 text-teal-800 bg-teal-50/60 font-semibold">
                            {JSON.stringify(diff.afterValue)}
                          </td>
                          <td className="py-2 px-3 font-sans text-slate-600">
                            {diff.operationTitle}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Removed Rows Preview */}
            {previewResult.removedRows.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-xs font-bold text-slate-700">
                  Rows Scheduled for Removal ({previewResult.removedRows.length})
                </h3>
                <div className="overflow-x-auto border border-slate-200 rounded-lg max-h-56">
                  <table className="w-full text-left border-collapse text-xs font-mono tabular-nums">
                    <thead>
                      <tr className="bg-slate-100 border-b border-slate-200 text-slate-700">
                        <th className="py-2 px-3 w-20">Row #</th>
                        <th className="py-2 px-3 font-sans">Reason for Removal</th>
                        <th className="py-2 px-3">Row Snapshot</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {previewResult.removedRows.map((rem, idx) => (
                        <tr key={idx} className="bg-rose-50/30">
                          <td className="py-2 px-3 text-rose-700 font-semibold">
                            #{rem.originalRowIndex + 1}
                          </td>
                          <td className="py-2 px-3 font-sans text-slate-700">{rem.reason}</td>
                          <td className="py-2 px-3 text-slate-500 truncate max-w-md">
                            {Object.entries(rem.row)
                              .slice(0, 4)
                              .map(([k, v]) => `${k}: "${v}"`)
                              .join(', ')}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {previewTab === 'after' && (
          <DataTableView
            columns={previewResult.afterColumns}
            rows={previewResult.afterRows}
            showWhitespaceMarkers={true}
          />
        )}

        {previewTab === 'before' && (
          <DataTableView
            columns={previewResult.beforeColumns}
            rows={previewResult.beforeRows}
            showWhitespaceMarkers={true}
          />
        )}
      </div>

      {/* Bottom Approval Bar */}
      <div className="bg-slate-900 text-white rounded-xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="text-xs text-slate-300">
          Ready to apply <span className="font-semibold text-white">{previewResult.operations.length} operation(s)</span> affecting <span className="font-mono text-teal-400">{previewResult.totalAffectedRows} row(s)</span> and <span className="font-mono text-teal-400">{previewResult.totalAffectedCells} cell(s)</span>?
        </div>
        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={onCancelReview}
            className="px-4 py-2 text-xs font-semibold text-slate-300 hover:text-white border border-slate-700 rounded-lg cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onEditInstructions}
            className="px-4 py-2 text-xs font-semibold text-white bg-slate-800 hover:bg-slate-700 rounded-lg cursor-pointer"
          >
            Edit Instructions
          </button>
          <button
            type="button"
            onClick={onApproveAndClean}
            className="px-5 py-2 text-xs font-semibold text-slate-950 bg-teal-400 hover:bg-teal-300 rounded-lg cursor-pointer"
          >
            Approve and Clean
          </button>
        </div>
      </div>
    </div>
  );
};
