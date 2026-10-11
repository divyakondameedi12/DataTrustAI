import React from 'react';
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  FileSpreadsheet,
  FolderOpen,
  Layers,
  Sliders,
  Upload,
} from 'lucide-react';
import { PageId, SessionDatasetRecord } from '../types/data';

interface DashboardPageProps {
  sessionDatasets: SessionDatasetRecord[];
  activeDatasetId: string | null;
  onSelectDataset: (id: string) => void;
  onNavigate: (page: PageId) => void;
  onLoadSampleDataset: (sampleType: 'customers' | 'hr') => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({
  sessionDatasets,
  activeDatasetId,
  onSelectDataset,
  onNavigate,
  onLoadSampleDataset,
}) => {
  // Compute real session statistics strictly from actual files processed in this session
  const totalRowsAnalyzed = sessionDatasets.reduce(
    (sum, ds) => sum + ds.initialReport.totalRows,
    0
  );
  const totalDuplicatesDetected = sessionDatasets.reduce(
    (sum, ds) => sum + ds.initialReport.duplicateRowsCount,
    0
  );
  const totalMissingDetected = sessionDatasets.reduce(
    (sum, ds) => sum + ds.initialReport.missingValuesCount,
    0
  );

  const activeDataset = sessionDatasets.find((d) => d.id === activeDatasetId) || null;

  return (
    <div className="space-y-8">
      {/* Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 font-display">
            Session Overview &amp; Quality Dashboard
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Real-time metrics calculated exclusively from datasets analyzed during your current
            browser session.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={() => onNavigate('upload')}
            className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Upload className="w-4 h-4" />
            <span>Upload New Dataset</span>
          </button>
        </div>
      </div>

      {/* Primary Session Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-2">
          <div className="text-xs font-medium text-slate-500">
            Total Rows Analyzed (Session)
          </div>
          <div className="text-3xl font-bold text-slate-900 font-mono tabular-nums">
            {totalRowsAnalyzed.toLocaleString()}
          </div>
          <div className="text-xs text-slate-500">
            Across {sessionDatasets.length} uploaded file{sessionDatasets.length === 1 ? '' : 's'}
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-2">
          <div className="text-xs font-medium text-slate-500">
            Duplicate Rows Detected
          </div>
          <div className="text-3xl font-bold text-slate-900 font-mono tabular-nums">
            {totalDuplicatesDetected.toLocaleString()}
          </div>
          <div className="text-xs text-slate-500">
            {activeDataset
              ? `${activeDataset.currentReport.duplicateRowsCount} remaining in active file`
              : '0 files analyzed yet'}
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-2">
          <div className="text-xs font-medium text-slate-500">
            Missing Values Detected
          </div>
          <div className="text-3xl font-bold text-slate-900 font-mono tabular-nums">
            {totalMissingDetected.toLocaleString()}
          </div>
          <div className="text-xs text-slate-500">
            {activeDataset
              ? `${activeDataset.currentReport.missingValuesCount} remaining in active file`
              : '0 files analyzed yet'}
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-2">
          <div className="text-xs font-medium text-slate-500">
            Active Dataset Health Score
          </div>
          <div className="text-3xl font-bold text-slate-900 font-mono tabular-nums">
            {activeDataset ? `${activeDataset.currentReport.qualityScore}%` : '0%'}
          </div>
          <div className="text-xs text-slate-500">
            {activeDataset
              ? `Initial upload score: ${activeDataset.initialReport.qualityScore}%`
              : 'Upload a dataset to compute'}
          </div>
        </div>
      </div>

      {/* Empty State or Active Dataset Quality Summary */}
      {!activeDataset ? (
        <div className="bg-white border border-slate-200 rounded-xl p-10 text-center space-y-5">
          <div className="w-12 h-12 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center mx-auto">
            <FolderOpen className="w-6 h-6" />
          </div>
          <div className="max-w-lg mx-auto space-y-2">
            <h2 className="text-lg font-bold text-slate-900 font-display">
              No Datasets Processed in This Session Yet
            </h2>
            <p className="text-sm text-slate-600 leading-relaxed">
              DataTrustAI never displays fabricated metrics. Upload a CSV or Excel (.xlsx) file
              from your computer, or load one of our built-in benchmark datasets below to inspect
              real quality diagnostics.
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <button
              type="button"
              onClick={() => onNavigate('upload')}
              className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Upload className="w-4 h-4" />
              <span>Upload CSV / XLSX File</span>
            </button>
            <button
              type="button"
              onClick={() => onLoadSampleDataset('customers')}
              className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <FileSpreadsheet className="w-4 h-4 text-sky-700" />
              <span>Load Sample E-Commerce CSV</span>
            </button>
            <button
              type="button"
              onClick={() => onLoadSampleDataset('hr')}
              className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <FileSpreadsheet className="w-4 h-4 text-teal-700" />
              <span>Load Sample HR Directory CSV</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Active Data Quality Summary Card */}
          <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-6 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-4">
              <div>
                <h2 className="text-base font-bold text-slate-900 font-display">
                  Data Quality Summary: {activeDataset.fileName}
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Current state: {activeDataset.currentRows.length} rows &middot;{' '}
                  {activeDataset.currentColumns.length} columns &middot;{' '}
                  {activeDataset.history.length} cleaning batch
                  {activeDataset.history.length === 1 ? '' : 'es'} applied
                </p>
              </div>
              <button
                type="button"
                onClick={() => onNavigate('quality')}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-sky-700 hover:text-sky-800 whitespace-nowrap shrink-0 cursor-pointer"
              >
                <span>Inspect Full Quality Analysis</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {Object.values(activeDataset.currentReport.issues).map((issue) => (
                <div
                  key={issue.type}
                  className="p-3.5 rounded-lg border border-slate-200 bg-slate-50/70 space-y-1"
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-mono font-bold text-base tabular-nums text-slate-900">
                      {issue.count}
                    </span>
                    {issue.count > 0 ? (
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                    ) : (
                      <CheckCircle2 className="w-3.5 h-3.5 text-teal-600" />
                    )}
                  </div>
                  <div className="text-xs font-medium text-slate-700 leading-snug">
                    {issue.title}
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-2 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => onNavigate('quality')}
                className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Inspect Affected Rows</span>
              </button>
              <button
                type="button"
                onClick={() => onNavigate('instructions')}
                className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Sliders className="w-3.5 h-3.5" />
                <span>Configure Cleaning Instructions</span>
              </button>
            </div>
          </div>

          {/* Recent Files Processed in Current Session */}
          <div className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-4">
              <div>
                <h2 className="text-base font-bold text-slate-900 font-display">
                  Recent Files Processed (Current Session)
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Switch between datasets uploaded during this session
                </p>
              </div>
              <span className="text-xs font-mono text-slate-500 tabular-nums">
                {sessionDatasets.length} total
              </span>
            </div>

            <div className="divide-y divide-slate-200">
              {sessionDatasets.map((ds) => {
                const isSelected = ds.id === activeDatasetId;
                return (
                  <div
                    key={ds.id}
                    className={`py-3.5 flex items-center justify-between gap-3 ${
                      isSelected ? 'bg-sky-50/50 -mx-3 px-3 rounded-lg' : ''
                    }`}
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <FileSpreadsheet className="w-4 h-4 text-sky-700 shrink-0" />
                        <span className="text-sm font-semibold text-slate-900 truncate">
                          {ds.fileName}
                        </span>
                      </div>
                      <div className="text-xs text-slate-500 mt-1 font-mono tabular-nums">
                        {ds.currentRows.length} rows &middot; {ds.currentColumns.length} cols
                        &middot; Score: {ds.currentReport.qualityScore}% &middot; {ds.uploadedAt}
                      </div>
                    </div>

                    <div className="shrink-0">
                      {isSelected ? (
                        <span className="text-xs font-semibold text-sky-700">Active</span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => onSelectDataset(ds.id)}
                          className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 cursor-pointer"
                        >
                          Select
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
