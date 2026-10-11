import React, { useState } from 'react';
import {
  CheckCircle2,
  History,
  Play,
  RotateCcw,
  ShieldCheck,
  Sliders,
  Undo2,
  Upload,
  XCircle,
} from 'lucide-react';
import { PageId, SessionDatasetRecord } from '../types/data';
import {
  runEndToEndVerificationSuite,
  VerificationCheckResult,
} from '../utils/selfTestSuite';

interface ChangeHistoryPageProps {
  activeDataset: SessionDatasetRecord | null;
  onUndoLastEntry: () => void;
  onRevertToEntry: (entryId: string) => void;
  onResetToOriginal: () => void;
  onNavigate: (page: PageId) => void;
}

export const ChangeHistoryPage: React.FC<ChangeHistoryPageProps> = ({
  activeDataset,
  onUndoLastEntry,
  onRevertToEntry,
  onResetToOriginal,
  onNavigate,
}) => {
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<VerificationCheckResult[] | null>(null);

  const handleRunVerification = () => {
    const res = runEndToEndVerificationSuite();
    setTestResults(res);
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 font-display">
            Change History &amp; Session Audit Log
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Review every operation performed during the current session, undo recent changes, or
            restore the original uploaded dataset.
          </p>
        </div>

        {activeDataset && activeDataset.history.length > 0 && (
          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={() => {
                onUndoLastEntry();
                setStatusMessage('Reverted the most recent cleaning operation batch.');
              }}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-slate-800 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Undo2 className="w-3.5 h-3.5" />
              <span>Undo Last Batch</span>
            </button>

            <button
              type="button"
              onClick={() => {
                onResetToOriginal();
                setStatusMessage(
                  `Restored "${activeDataset.fileName}" to its original uploaded state (${activeDataset.originalRows.length} rows).`
                );
              }}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-rose-800 bg-rose-50 border border-rose-200 hover:bg-rose-100 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset to Original Dataset</span>
            </button>
          </div>
        )}
      </div>

      {statusMessage && (
        <div
          role="status"
          className="bg-teal-50 border border-teal-200 rounded-xl p-4 flex items-center justify-between gap-4 text-xs text-teal-950"
        >
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-teal-600 shrink-0" />
            <span className="font-medium">{statusMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setStatusMessage(null)}
            className="text-teal-700 hover:text-teal-950 font-semibold cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Dataset Change History Section */}
      {!activeDataset ? (
        <div className="bg-white border border-slate-200 rounded-xl p-10 text-center space-y-4">
          <div className="w-12 h-12 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center mx-auto">
            <History className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-bold text-slate-900 font-display">
            No Active Dataset in Session
          </h2>
          <p className="text-sm text-slate-600 max-w-md mx-auto">
            Upload a dataset and apply cleaning operations to view your chronological operation
            history and snapshot rollback controls.
          </p>
          <button
            type="button"
            onClick={() => onNavigate('upload')}
            className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
          >
            <Upload className="w-4 h-4" />
            <span>Upload Dataset</span>
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Original Dataset Baseline Card */}
          <div className="bg-white border border-slate-200 rounded-xl p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="text-xs font-mono text-teal-700">
                Original Dataset Snapshot (Preserved in Browser Memory)
              </div>
              <h2 className="text-base font-bold text-slate-900 font-display">
                {activeDataset.fileName} — Initial Upload Baseline
              </h2>
              <p className="text-xs text-slate-600 font-mono tabular-nums">
                {activeDataset.originalRows.length} original rows &middot;{' '}
                {activeDataset.originalColumns.length} original columns &middot; Uploaded at{' '}
                {activeDataset.uploadedAt}
              </p>
            </div>

            <div className="shrink-0">
              {activeDataset.history.length === 0 ? (
                <span className="text-xs font-semibold text-slate-500">
                  Currently at Original State
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    onResetToOriginal();
                    setStatusMessage(
                      `Restored "${activeDataset.fileName}" to its original uploaded state.`
                    );
                  }}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Restore Original Baseline</span>
                </button>
              )}
            </div>
          </div>

          {/* Operations Timeline */}
          {activeDataset.history.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-xl p-8 text-center space-y-3">
              <div className="text-sm font-bold text-slate-900 font-display">
                No Cleaning Operations Applied Yet
              </div>
              <p className="text-xs text-slate-600 max-w-md mx-auto">
                Your dataset is currently unmodified. Configure custom cleaning instructions and
                approve them on the Review screen to record operations here.
              </p>
              <button
                type="button"
                onClick={() => onNavigate('instructions')}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
              >
                <Sliders className="w-3.5 h-3.5" />
                <span>Go to Custom Instructions</span>
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-slate-900 font-display">
                Chronological Operations Performed ({activeDataset.history.length})
              </h3>

              <div className="space-y-4">
                {activeDataset.history.map((entry, idx) => {
                  const isLatest = idx === activeDataset.history.length - 1;
                  return (
                    <div
                      key={entry.id}
                      className="bg-white border border-slate-200 rounded-xl p-6 space-y-4"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-mono text-sky-700 font-semibold">
                              Batch #{idx + 1}
                            </span>
                            <span aria-hidden="true" className="text-slate-300">
                              &middot;
                            </span>
                            <span className="text-xs font-mono text-slate-500 tabular-nums">
                              {entry.timestamp}
                            </span>
                          </div>
                          <h4 className="text-base font-bold text-slate-900 font-display mt-0.5">
                            {entry.operationName}
                          </h4>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          {isLatest ? (
                            <button
                              type="button"
                              onClick={() => {
                                onUndoLastEntry();
                                setStatusMessage(`Undid Batch #${idx + 1} (${entry.operationName}).`);
                              }}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
                            >
                              <Undo2 className="w-3.5 h-3.5" />
                              <span>Undo This Batch</span>
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => {
                                onRevertToEntry(entry.id);
                                setStatusMessage(
                                  `Reverted dataset state to Batch #${idx + 1} (${entry.operationName}).`
                                );
                              }}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                              <span>Revert to This Point</span>
                            </button>
                          )}
                        </div>
                      </div>

                      <p className="text-xs text-slate-600 leading-relaxed">{entry.description}</p>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1 font-mono text-xs tabular-nums">
                        <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                          <div className="text-slate-500 font-sans text-[11px]">
                            Affected Records (Rows)
                          </div>
                          <div className="font-bold text-slate-900 text-sm mt-0.5">
                            {entry.affectedRows}
                          </div>
                        </div>
                        <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                          <div className="text-slate-500 font-sans text-[11px]">
                            Affected Cells
                          </div>
                          <div className="font-bold text-slate-900 text-sm mt-0.5">
                            {entry.affectedCells}
                          </div>
                        </div>
                        <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                          <div className="text-slate-500 font-sans text-[11px]">
                            Rows Before &rarr; After
                          </div>
                          <div className="font-bold text-slate-900 text-sm mt-0.5">
                            {entry.metricsSummary.beforeRowCount} &rarr;{' '}
                            {entry.metricsSummary.afterRowCount}
                          </div>
                        </div>
                        <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                          <div className="text-slate-500 font-sans text-[11px]">
                            Duplicates &amp; Missing Fixed
                          </div>
                          <div className="font-bold text-slate-900 text-sm mt-0.5">
                            {entry.metricsSummary.duplicatesRemoved} dup /{' '}
                            {entry.metricsSummary.missingValuesHandled} miss
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Built-in Automated End-to-End 10-Step Verification Runner */}
      <div className="bg-slate-900 text-white rounded-xl p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs font-medium text-teal-400">
              <ShieldCheck className="w-4 h-4" />
              <span>Deterministic Self-Test &amp; Quality Assurance Suite</span>
            </div>
            <h2 className="text-base font-bold font-display">
              10-Step End-to-End Functional Verification
            </h2>
            <p className="text-xs text-slate-400">
              Run our automated in-browser verification suite to test CSV parsing, duplicate
              detection, missing value detection, custom instruction parsing, diff preview,
              approval, CSV export integrity, and invalid input handling.
            </p>
          </div>

          <button
            type="button"
            onClick={handleRunVerification}
            className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-semibold text-slate-950 bg-teal-400 hover:bg-teal-300 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Play className="w-3.5 h-3.5" />
            <span>Run 10-Step Verification Suite</span>
          </button>
        </div>

        {testResults && (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-teal-400">
                Passed {testResults.filter((r) => r.passed).length} of {testResults.length} Checks
              </span>
              <span className="font-mono text-slate-400">100% Deterministic Browser Execution</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {testResults.map((r) => (
                <div
                  key={r.stepNumber}
                  className="p-3.5 rounded-lg bg-slate-950 border border-slate-800 flex items-start gap-3 text-xs"
                >
                  {r.passed ? (
                    <CheckCircle2 className="w-4 h-4 text-teal-400 shrink-0 mt-0.5" />
                  ) : (
                    <XCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  )}
                  <div className="space-y-1">
                    <div className="font-semibold text-white">{r.name}</div>
                    <p className="text-slate-400 leading-relaxed">{r.details}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
