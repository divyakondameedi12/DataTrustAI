/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo, useState } from 'react';
import {
  CheckSquare,
  Download,
  FileSpreadsheet,
  GitCompare,
  History,
  Home,
  LayoutDashboard,
  Menu,
  ShieldCheck,
  Sliders,
  Upload,
  X,
} from 'lucide-react';
import { ChangeHistoryPage } from './components/ChangeHistoryPage';
import { CleanedDatasetPage } from './components/CleanedDatasetPage';
import { CustomInstructionsPage } from './components/CustomInstructionsPage';
import { DashboardPage } from './components/DashboardPage';
import { DataQualityPage } from './components/DataQualityPage';
import { DataUploadPage } from './components/DataUploadPage';
import { LandingPage } from './components/LandingPage';
import { ReviewApprovalPage } from './components/ReviewApprovalPage';
import {
  ChangeHistoryEntry,
  CleaningPreviewResult,
  PageId,
  ParsedInstructionResult,
  SessionDatasetRecord,
} from './types/data';
import {
  analyzeDataset,
  parseCSVText,
  parseUploadedFile,
  SAMPLE_HR_RECORDS_CSV,
  SAMPLE_MESSY_CUSTOMERS_CSV,
  simulateCleaningOperations,
} from './utils/dataEngine';

const NAV_ITEMS: { id: PageId; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'upload', label: 'Data Upload', icon: Upload },
  { id: 'quality', label: 'Data Quality Analysis', icon: CheckSquare },
  { id: 'instructions', label: 'Custom Instructions', icon: Sliders },
  { id: 'review', label: 'Review & Approval', icon: GitCompare },
  { id: 'cleaned', label: 'Cleaned Dataset', icon: Download },
  { id: 'history', label: 'Change History', icon: History },
];

export default function App() {
  const [activePage, setActivePage] = useState<PageId>('landing');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Session datasets processed during current session (starts empty: 0 invented stats)
  const [sessionDatasets, setSessionDatasets] = useState<SessionDatasetRecord[]>([]);
  const [activeDatasetId, setActiveDatasetId] = useState<string | null>(null);

  // Instruction text & pending review preview
  const [instructionText, setInstructionText] = useState<string>('');
  const [pendingPreview, setPendingPreview] = useState<CleaningPreviewResult | null>(null);

  const activeDataset = useMemo(
    () => sessionDatasets.find((d) => d.id === activeDatasetId) || null,
    [sessionDatasets, activeDatasetId]
  );

  const registerNewDataset = (
    fileName: string,
    fileSize: number,
    fileType: 'CSV' | 'XLSX',
    columns: string[],
    rows: Record<string, string>[]
  ) => {
    const initialReport = analyzeDataset(columns, rows);
    const nowStr = new Date().toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });

    const newRecord: SessionDatasetRecord = {
      id: `ds_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      fileName,
      fileSize,
      fileType,
      uploadedAt: nowStr,
      originalColumns: [...columns],
      originalRows: rows.map((r) => ({ ...r })),
      currentColumns: [...columns],
      currentRows: rows.map((r) => ({ ...r })),
      initialReport,
      currentReport: initialReport,
      history: [],
    };

    setSessionDatasets((prev) => [newRecord, ...prev]);
    setActiveDatasetId(newRecord.id);
    setPendingPreview(null);
  };

  const handleUploadFile = async (file: File) => {
    const parsed = await parseUploadedFile(file);
    registerNewDataset(
      file.name,
      file.size,
      parsed.fileType,
      parsed.columns,
      parsed.rows
    );
  };

  const handleLoadSampleDataset = (sampleType: 'customers' | 'hr') => {
    const csvRaw =
      sampleType === 'customers' ? SAMPLE_MESSY_CUSTOMERS_CSV : SAMPLE_HR_RECORDS_CSV;
    const fileName =
      sampleType === 'customers'
        ? 'messy_customer_orders_2026.csv'
        : 'hr_employee_roster_raw.csv';
    const parsed = parseCSVText(csvRaw);
    registerNewDataset(
      fileName,
      new Blob([csvRaw]).size,
      'CSV',
      parsed.columns,
      parsed.rows
    );
  };

  const handleRemoveActiveDataset = () => {
    if (!activeDatasetId) return;
    setSessionDatasets((prev) => {
      const remaining = prev.filter((d) => d.id !== activeDatasetId);
      setActiveDatasetId(remaining[0]?.id ?? null);
      return remaining;
    });
    setPendingPreview(null);
  };

  const handleAddInstructionClause = (clause: string) => {
    setInstructionText((prev) => {
      const trimmed = prev.trim();
      if (!trimmed) return `${clause}.`;
      const cleanPrev = trimmed.replace(/\.$/, '');
      return `${cleanPrev}, and ${clause.charAt(0).toLowerCase() + clause.slice(1)}.`;
    });
  };

  const handleSubmitForReview = (parsed: ParsedInstructionResult) => {
    if (!activeDataset || parsed.recognized.length === 0) return;
    const simulation = simulateCleaningOperations(
      activeDataset.currentColumns,
      activeDataset.currentRows,
      parsed.recognized
    );
    setPendingPreview(simulation);
    setActivePage('review');
  };

  const commitCleaningPreview = (
    preview: CleaningPreviewResult,
    navigateAfterCommit: boolean
  ) => {
    if (!activeDataset) return;

    const newColumns = [...preview.afterColumns];
    const newRows = preview.afterRows.map((r) => ({ ...r }));
    const newReport = analyzeDataset(newColumns, newRows);

    const nowStr = new Date().toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });

    const opNames = preview.operations.map((o) => o.title).join('; ');
    const historyEntry: ChangeHistoryEntry = {
      id: `hist_${Date.now()}`,
      timestamp: nowStr,
      operationName:
        preview.operations.length === 1
          ? preview.operations[0].title
          : `${preview.operations.length} Cleaning Operations Applied`,
      description: opNames,
      affectedRows: preview.totalAffectedRows,
      affectedCells: preview.totalAffectedCells,
      operationsApplied: preview.operations,
      snapshotColumns: newColumns,
      snapshotRows: newRows.map((r) => ({ ...r })),
      metricsSummary: {
        beforeRowCount: preview.beforeRows.length,
        afterRowCount: newRows.length,
        duplicatesRemoved: preview.duplicatesRemoved,
        missingValuesHandled:
          preview.missingValuesReplaced + preview.missingRowsRemoved,
        columnsChanged: preview.columnChanges.filter(
          (c) => c.changeType !== 'unchanged'
        ).length,
      },
    };

    setSessionDatasets((prev) =>
      prev.map((ds) => {
        if (ds.id !== activeDataset.id) return ds;
        return {
          ...ds,
          currentColumns: newColumns,
          currentRows: newRows,
          currentReport: newReport,
          history: [...ds.history, historyEntry],
          lastCleaningSummary: {
            originalRowCount: ds.originalRows.length,
            cleanedRowCount: newRows.length,
            duplicatesRemoved:
              (ds.lastCleaningSummary?.duplicatesRemoved ?? 0) +
              preview.duplicatesRemoved,
            missingValuesHandled:
              (ds.lastCleaningSummary?.missingValuesHandled ?? 0) +
              preview.missingValuesReplaced +
              preview.missingRowsRemoved,
            columnChanges: preview.columnChanges,
            operationsPerformed: [
              ...(ds.lastCleaningSummary?.operationsPerformed ?? []),
              ...preview.operationMetrics,
            ],
          },
        };
      })
    );

    setPendingPreview(null);
    if (navigateAfterCommit) {
      setActivePage('cleaned');
    }
  };

  const handleApproveAndClean = () => {
    if (!pendingPreview) return;
    commitCleaningPreview(pendingPreview, true);
  };

  const handleApplyDirectCleaning = (preview: CleaningPreviewResult) => {
    commitCleaningPreview(preview, false);
  };

  const handleUndoLastEntry = () => {
    if (!activeDataset || activeDataset.history.length === 0) return;

    setSessionDatasets((prev) =>
      prev.map((ds) => {
        if (ds.id !== activeDataset.id) return ds;
        const newHistory = ds.history.slice(0, -1);
        if (newHistory.length === 0) {
          const origCols = [...ds.originalColumns];
          const origRows = ds.originalRows.map((r) => ({ ...r }));
          return {
            ...ds,
            currentColumns: origCols,
            currentRows: origRows,
            currentReport: analyzeDataset(origCols, origRows),
            history: [],
            lastCleaningSummary: undefined,
          };
        }
        const prevSnap = newHistory[newHistory.length - 1];
        const cols = [...prevSnap.snapshotColumns];
        const rows = prevSnap.snapshotRows.map((r) => ({ ...r }));
        return {
          ...ds,
          currentColumns: cols,
          currentRows: rows,
          currentReport: analyzeDataset(cols, rows),
          history: newHistory,
        };
      })
    );
  };

  const handleRevertToEntry = (entryId: string) => {
    if (!activeDataset) return;
    setSessionDatasets((prev) =>
      prev.map((ds) => {
        if (ds.id !== activeDataset.id) return ds;
        const idx = ds.history.findIndex((h) => h.id === entryId);
        if (idx === -1) return ds;
        const slicedHistory = ds.history.slice(0, idx + 1);
        const targetSnap = slicedHistory[slicedHistory.length - 1];
        const cols = [...targetSnap.snapshotColumns];
        const rows = targetSnap.snapshotRows.map((r) => ({ ...r }));
        return {
          ...ds,
          currentColumns: cols,
          currentRows: rows,
          currentReport: analyzeDataset(cols, rows),
          history: slicedHistory,
        };
      })
    );
  };

  const handleResetToOriginal = () => {
    if (!activeDataset) return;
    setSessionDatasets((prev) =>
      prev.map((ds) => {
        if (ds.id !== activeDataset.id) return ds;
        const origCols = [...ds.originalColumns];
        const origRows = ds.originalRows.map((r) => ({ ...r }));
        return {
          ...ds,
          currentColumns: origCols,
          currentRows: origRows,
          currentReport: analyzeDataset(origCols, origRows),
          history: [],
          lastCleaningSummary: undefined,
        };
      })
    );
    setPendingPreview(null);
  };

  // Page 1: Landing Page
  if (activePage === 'landing') {
    return (
      <LandingPage
        onGetStarted={() => setActivePage('dashboard')}
        onLoadSampleAndStart={() => {
          handleLoadSampleDataset('customers');
          setActivePage('quality');
        }}
      />
    );
  }

  const currentNavMeta =
    NAV_ITEMS.find((n) => n.id === activePage) || NAV_ITEMS[0];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col lg:flex-row">
      {/* Desktop Sidebar Navigation (264px width) */}
      <aside className="hidden lg:flex lg:flex-col lg:w-64 lg:shrink-0 bg-slate-950 text-slate-300 border-r border-slate-800 min-h-screen sticky top-0 h-screen">
        {/* Brand Header */}
        <div className="px-6 py-5 border-b border-slate-800 flex items-center justify-between">
          <button
            type="button"
            onClick={() => setActivePage('landing')}
            className="text-left group cursor-pointer"
          >
            <div className="text-lg font-bold text-white font-display tracking-tight">
              DataTrustAI
            </div>
            <div className="text-[11px] text-teal-400">
              Clean Data. Confident Decisions.
            </div>
          </button>
        </div>

        {/* Active Dataset Quick Context */}
        <div className="px-4 py-3.5 border-b border-slate-800/80 bg-slate-900/60">
          <div className="text-[11px] text-slate-400 font-medium">Active Dataset</div>
          {activeDataset ? (
            <div className="mt-1 space-y-1">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-white truncate">
                <FileSpreadsheet className="w-3.5 h-3.5 text-teal-400 shrink-0" />
                <span className="truncate">{activeDataset.fileName}</span>
              </div>
              <div className="text-[11px] font-mono text-slate-400 tabular-nums">
                {activeDataset.currentRows.length} rows &middot;{' '}
                {activeDataset.currentColumns.length} cols &middot;{' '}
                {activeDataset.currentReport.qualityScore}% health
              </div>
            </div>
          ) : (
            <div className="text-xs text-slate-500 mt-1">No file uploaded yet</div>
          )}
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = activePage === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActivePage(item.id)}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                  isActive
                    ? 'bg-sky-600 text-white'
                    : 'text-slate-300 hover:bg-slate-900 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{item.label}</span>
                </div>
                {item.id === 'review' && pendingPreview && (
                  <span className="font-mono text-[10px] text-teal-300">Pending</span>
                )}
              </button>
            );
          })}

          <div className="pt-4 mt-4 border-t border-slate-800/80">
            <button
              type="button"
              onClick={() => setActivePage('landing')}
              className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-xs font-medium text-slate-400 hover:bg-slate-900 hover:text-white transition-colors cursor-pointer"
            >
              <Home className="w-4 h-4 shrink-0" />
              <span>Return to Landing Page</span>
            </button>
          </div>
        </nav>

        {/* Privacy Footer in Sidebar */}
        <div className="p-4 border-t border-slate-800 text-[11px] text-slate-400 space-y-1.5">
          <div className="flex items-center gap-1.5 text-teal-400 font-medium">
            <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
            <span>100% Browser-Local Engine</span>
          </div>
          <div className="text-slate-500">DataTrustAI Workspace</div>
        </div>
      </aside>

      {/* Mobile Navigation Drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-slate-950/60"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="relative w-72 max-w-full bg-slate-950 text-slate-200 h-full flex flex-col justify-between z-10 p-4">
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                <div>
                  <div className="text-base font-bold text-white font-display">
                    DataTrustAI
                  </div>
                  <div className="text-[11px] text-teal-400">
                    Clean Data. Confident Decisions.
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-1.5 text-slate-400 hover:text-white"
                  aria-label="Close navigation menu"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <nav className="space-y-1">
                {NAV_ITEMS.map((item) => {
                  const Icon = item.icon;
                  const isActive = activePage === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        setActivePage(item.id);
                        setMobileMenuOpen(false);
                      }}
                      className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-xs font-semibold ${
                        isActive
                          ? 'bg-sky-600 text-white'
                          : 'text-slate-300 hover:bg-slate-900'
                      }`}
                    >
                      <Icon className="w-4 h-4 shrink-0" />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
                <button
                  type="button"
                  onClick={() => {
                    setActivePage('landing');
                    setMobileMenuOpen(false);
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-xs font-medium text-slate-400 hover:bg-slate-900"
                >
                  <Home className="w-4 h-4 shrink-0" />
                  <span>Landing Page</span>
                </button>
              </nav>
            </div>

            <div className="pt-4 border-t border-slate-800 text-[11px] text-slate-400">
              DataTrustAI &middot; Clean Data. Confident Decisions.
            </div>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Workspace Top Bar Contract: Breadcrumb trail on left, 1 primary action on right */}
        <header className="sticky top-0 z-20 bg-white border-b border-slate-200 px-6 lg:px-10 py-3.5 flex items-center justify-between gap-6">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden p-1.5 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-100"
              aria-label="Open navigation menu"
            >
              <Menu className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-2 text-xs text-slate-500 truncate">
              <span className="font-semibold text-slate-900">DataTrustAI</span>
              <span aria-hidden="true">/</span>
              <span className="font-medium text-slate-700 truncate">
                {currentNavMeta.label}
              </span>
              {activeDataset && (
                <>
                  <span aria-hidden="true" className="hidden sm:inline">
                    /
                  </span>
                  <span className="hidden sm:inline font-mono text-slate-500 truncate">
                    {activeDataset.fileName}
                  </span>
                </>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {!activeDataset ? (
              <button
                type="button"
                onClick={() => {
                  handleLoadSampleDataset('customers');
                  setActivePage('quality');
                }}
                className="px-3.5 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                Load Sample CSV
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setActivePage('upload')}
                className="px-3.5 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                Switch / Upload File
              </button>
            )}
          </div>
        </header>

        {/* Page Viewport */}
        <main className="flex-1 p-6 lg:p-10 max-w-7xl w-full mx-auto">
          {activePage === 'dashboard' && (
            <DashboardPage
              sessionDatasets={sessionDatasets}
              activeDatasetId={activeDatasetId}
              onSelectDataset={(id) => setActiveDatasetId(id)}
              onNavigate={(p) => setActivePage(p)}
              onLoadSampleDataset={(type) => {
                handleLoadSampleDataset(type);
              }}
            />
          )}

          {activePage === 'upload' && (
            <DataUploadPage
              activeDataset={activeDataset}
              onUploadFile={handleUploadFile}
              onLoadSampleDataset={handleLoadSampleDataset}
              onRemoveActiveDataset={handleRemoveActiveDataset}
              onNavigate={(p) => setActivePage(p)}
            />
          )}

          {activePage === 'quality' && (
            <DataQualityPage
              activeDataset={activeDataset}
              onNavigate={(p) => setActivePage(p)}
              onAddInstructionText={handleAddInstructionClause}
              onApplyDirectCleaning={handleApplyDirectCleaning}
              onResetToOriginal={handleResetToOriginal}
            />
          )}

          {activePage === 'instructions' && (
            <CustomInstructionsPage
              activeDataset={activeDataset}
              instructionText={instructionText}
              onChangeInstructionText={setInstructionText}
              onSubmitForReview={handleSubmitForReview}
              onNavigate={(p) => setActivePage(p)}
            />
          )}

          {activePage === 'review' && (
            <ReviewApprovalPage
              activeDataset={activeDataset}
              previewResult={pendingPreview}
              onApproveAndClean={handleApproveAndClean}
              onEditInstructions={() => setActivePage('instructions')}
              onCancelReview={() => {
                setPendingPreview(null);
                setActivePage('quality');
              }}
              onNavigate={(p) => setActivePage(p)}
            />
          )}

          {activePage === 'cleaned' && (
            <CleanedDatasetPage
              activeDataset={activeDataset}
              onNavigate={(p) => setActivePage(p)}
            />
          )}

          {activePage === 'history' && (
            <ChangeHistoryPage
              activeDataset={activeDataset}
              onUndoLastEntry={handleUndoLastEntry}
              onRevertToEntry={handleRevertToEntry}
              onResetToOriginal={handleResetToOriginal}
              onNavigate={(p) => setActivePage(p)}
            />
          )}
        </main>

        {/* Quiet Workspace Footer */}
        <footer className="px-6 lg:px-10 py-4 border-t border-slate-200 bg-white text-xs text-slate-500 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div>
            DataTrustAI &middot; Clean Data. Confident Decisions.
          </div>
          <div>
            100% Local Browser Processing
          </div>
        </footer>
      </div>
    </div>
  );
}
