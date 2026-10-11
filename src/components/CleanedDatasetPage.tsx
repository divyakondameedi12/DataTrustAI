import React, { useState } from 'react';
import {
  ArrowRight,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  History,
  Sliders,
  Upload,
} from 'lucide-react';
import { PageId, SessionDatasetRecord } from '../types/data';
import {
  downloadCleanedCSV,
  downloadCleanedXLSX,
  generateCSVContent,
} from '../utils/dataEngine';
import { DataTableView } from './DataTableView';

interface CleanedDatasetPageProps {
  activeDataset: SessionDatasetRecord | null;
  onNavigate: (page: PageId) => void;
}

export const CleanedDatasetPage: React.FC<CleanedDatasetPageProps> = ({
  activeDataset,
  onNavigate,
}) => {
  const [downloadToast, setDownloadToast] = useState<string | null>(null);
  const [showRawCsvPreview, setShowRawCsvPreview] = useState(false);

  if (!activeDataset) {
    return (
      <div className="bg-white border border-slate-200 rounded-xl p-10 text-center space-y-4">
        <h1 className="text-xl font-bold text-slate-900 font-display">
          No Dataset Available for Export
        </h1>
        <p className="text-sm text-slate-600 max-w-md mx-auto">
          Upload and clean a dataset first to inspect the cleaned table and download verified CSV or
          Excel (.xlsx) files.
        </p>
        <button
          type="button"
          onClick={() => onNavigate('upload')}
          className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
        >
          <Upload className="w-4 h-4" />
          <span>Go to Data Upload</span>
        </button>
      </div>
    );
  }

  const summary = activeDataset.lastCleaningSummary;
  const originalRowCount = activeDataset.originalRows.length;
  const cleanedRowCount = activeDataset.currentRows.length;
  const duplicatesRemoved =
    summary?.duplicatesRemoved ??
    Math.max(
      0,
      activeDataset.initialReport.duplicateRowsCount -
        activeDataset.currentReport.duplicateRowsCount
    );
  const missingHandled =
    summary?.missingValuesHandled ??
    Math.max(
      0,
      activeDataset.initialReport.missingValuesCount -
        activeDataset.currentReport.missingValuesCount
    );
  const columnChanges =
    summary?.columnChanges.filter((c) => c.changeType !== 'unchanged') ?? [];

  const handleDownloadCSV = () => {
    downloadCleanedCSV(
      activeDataset.currentColumns,
      activeDataset.currentRows,
      activeDataset.fileName
    );
    const baseName = activeDataset.fileName.replace(/\.(csv|xlsx|xls)$/i, '') || 'dataset';
    setDownloadToast(`Downloaded "${baseName}_cleaned.csv" (${cleanedRowCount} rows).`);
  };

  const handleDownloadXLSX = () => {
    downloadCleanedXLSX(
      activeDataset.currentColumns,
      activeDataset.currentRows,
      activeDataset.fileName
    );
    const baseName = activeDataset.fileName.replace(/\.(csv|xlsx|xls)$/i, '') || 'dataset';
    setDownloadToast(`Downloaded "${baseName}_cleaned.xlsx" (${cleanedRowCount} rows).`);
  };

  return (
    <div className="space-y-8">
      {/* Header & Real Download Buttons */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-6 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 font-display">
            Cleaned Dataset &amp; Export Studio
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Verified output for{' '}
            <span className="font-semibold text-slate-900">{activeDataset.fileName}</span>.
            Download your cleaned dataset as a standard CSV or native Microsoft Excel (.xlsx)
            workbook.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={handleDownloadCSV}
            className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Download className="w-4 h-4 text-teal-400" />
            <span>Download Cleaned CSV</span>
          </button>

          <button
            type="button"
            onClick={handleDownloadXLSX}
            className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-sky-600 hover:bg-sky-700 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Download Cleaned Excel (.xlsx)</span>
          </button>
        </div>
      </div>

      {/* Download Confirmation Toast */}
      {downloadToast && (
        <div
          role="status"
          className="bg-teal-50 border border-teal-200 rounded-xl p-4 flex items-center justify-between gap-4 text-xs text-teal-950"
        >
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-teal-600 shrink-0" />
            <span className="font-medium">{downloadToast}</span>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setShowRawCsvPreview((v) => !v)}
              className="font-semibold text-teal-800 hover:text-teal-950 underline underline-offset-4 cursor-pointer"
            >
              {showRawCsvPreview ? 'Hide Raw CSV Output' : 'Inspect Exported CSV Text'}
            </button>
            <button
              type="button"
              onClick={() => setDownloadToast(null)}
              className="text-slate-500 hover:text-slate-800 cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Optional Raw CSV Content Verification Viewer */}
      {showRawCsvPreview && (
        <div className="bg-slate-900 text-slate-100 rounded-xl p-5 space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Actual Generated CSV File Content (RFC-4180)</span>
            <button
              type="button"
              onClick={() => setShowRawCsvPreview(false)}
              className="text-slate-300 hover:text-white cursor-pointer"
            >
              Close
            </button>
          </div>
          <pre className="p-3 bg-slate-950 border border-slate-800 rounded-lg text-xs font-mono text-teal-300 overflow-x-auto max-h-48">
            {generateCSVContent(activeDataset.currentColumns, activeDataset.currentRows)}
          </pre>
        </div>
      )}

      {/* Required Before vs. After Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-1">
          <div className="text-xs text-slate-500">Original Row Count</div>
          <div className="text-2xl font-bold text-slate-900 font-mono tabular-nums">
            {originalRowCount.toLocaleString()}
          </div>
          <div className="text-xs text-slate-500">Initial uploaded rows</div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-1">
          <div className="text-xs text-slate-500">Cleaned Row Count</div>
          <div className="text-2xl font-bold text-teal-700 font-mono tabular-nums">
            {cleanedRowCount.toLocaleString()}
          </div>
          <div className="text-xs text-slate-500">
            Active verified rows
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-1">
          <div className="text-xs text-slate-500">Duplicate Rows Removed</div>
          <div className="text-2xl font-bold text-slate-900 font-mono tabular-nums">
            {duplicatesRemoved.toLocaleString()}
          </div>
          <div className="text-xs text-slate-500">
            Remaining duplicates: {activeDataset.currentReport.duplicateRowsCount}
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-1">
          <div className="text-xs text-slate-500">Missing Values Handled</div>
          <div className="text-2xl font-bold text-slate-900 font-mono tabular-nums">
            {missingHandled.toLocaleString()}
          </div>
          <div className="text-xs text-slate-500">
            Remaining missing: {activeDataset.currentReport.missingValuesCount}
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-1">
          <div className="text-xs text-slate-500">Column Changes</div>
          <div className="text-2xl font-bold text-slate-900 font-mono tabular-nums">
            {columnChanges.length.toLocaleString()}
          </div>
          <div className="text-xs text-slate-500 font-mono tabular-nums">
            Cols: {activeDataset.originalColumns.length} &rarr; {activeDataset.currentColumns.length}
          </div>
        </div>
      </div>

      {/* Summary of Operations Performed & Column Changes */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
            <h2 className="text-base font-bold text-slate-900 font-display">
              Summary of Operations Performed
            </h2>
            <button
              type="button"
              onClick={() => onNavigate('history')}
              className="inline-flex items-center gap-1 text-xs font-semibold text-sky-700 hover:text-sky-800 cursor-pointer"
            >
              <History className="w-3.5 h-3.5" />
              <span>View Full Change History</span>
            </button>
          </div>

          {!summary || summary.operationsPerformed.length === 0 ? (
            <div className="p-5 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-600 flex items-center justify-between">
              <span>
                No cleaning operations have been approved on this dataset yet. Showing current data.
              </span>
              <button
                type="button"
                onClick={() => onNavigate('instructions')}
                className="inline-flex items-center gap-1 font-semibold text-sky-700 hover:text-sky-800 cursor-pointer shrink-0 ml-3"
              >
                <Sliders className="w-3.5 h-3.5" />
                <span>Add Instructions</span>
              </button>
            </div>
          ) : (
            <div className="divide-y divide-slate-200">
              {summary.operationsPerformed.map((op, i) => (
                <div key={op.operationId} className="py-3 flex items-center justify-between gap-4">
                  <div>
                    <div className="text-xs font-bold text-slate-900">
                      {i + 1}. {op.title}
                    </div>
                    <div className="text-xs text-slate-500 mt-0.5">{op.description}</div>
                  </div>
                  <div className="text-xs font-mono tabular-nums text-slate-700 shrink-0 text-right">
                    <div>{op.affectedRowsCount} row(s)</div>
                    <div className="text-slate-400">{op.affectedCellsCount} cell(s)</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
            <h2 className="text-base font-bold text-slate-900 font-display">
              Column Schema Changes
            </h2>
            <span className="text-xs font-mono text-slate-500 tabular-nums">
              {activeDataset.currentColumns.length} active columns
            </span>
          </div>

          {columnChanges.length === 0 ? (
            <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-500">
              All original column headers were retained without renaming or removal.
            </div>
          ) : (
            <div className="space-y-2 max-h-56 overflow-y-auto">
              {columnChanges.map((col, idx) => (
                <div
                  key={idx}
                  className="p-2.5 rounded-lg border border-slate-200 bg-slate-50 flex items-center justify-between gap-2 font-mono text-xs"
                >
                  <span className="text-slate-600 truncate">&quot;{col.beforeName}&quot;</span>
                  <ArrowRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  {col.changeType === 'removed' ? (
                    <span className="text-rose-700 font-semibold">(Removed)</span>
                  ) : (
                    <span className="text-teal-700 font-semibold truncate">
                      &quot;{col.afterName}&quot;
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Cleaned Dataset Table */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <h2 className="text-base font-bold text-slate-900 font-display">
            Cleaned Dataset Table ({activeDataset.currentRows.length} rows &times;{' '}
            {activeDataset.currentColumns.length} columns)
          </h2>
          <button
            type="button"
            onClick={() => setShowRawCsvPreview((v) => !v)}
            className="text-xs font-semibold text-sky-700 hover:text-sky-800 cursor-pointer self-start sm:self-auto"
          >
            {showRawCsvPreview ? 'Hide Raw CSV Preview' : 'Inspect Raw Exported CSV String'}
          </button>
        </div>

        <DataTableView
          columns={activeDataset.currentColumns}
          rows={activeDataset.currentRows}
          showWhitespaceMarkers={false}
        />
      </div>
    </div>
  );
};
