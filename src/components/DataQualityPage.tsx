import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Download,
  Eye,
  FileSpreadsheet,
  Play,
  RotateCcw,
  Sliders,
  Sparkles,
  Upload,
} from 'lucide-react';
import {
  CleaningPreviewResult,
  DuplicateHandlingMode,
  IssueType,
  MissingValueActionType,
  PageId,
  ParsedInstructionResult,
  RecognizedOperation,
  SessionDatasetRecord,
} from '../types/data';
import {
  calculateColumnMean,
  calculateColumnMedian,
  countDuplicatesByColumns,
  downloadCleanedCSV,
  downloadCleanedXLSX,
  parseCleaningInstructions,
  simulateCleaningOperations,
} from '../utils/dataEngine';
import { DataTableView } from './DataTableView';

interface DataQualityPageProps {
  activeDataset: SessionDatasetRecord | null;
  onNavigate: (page: PageId) => void;
  onAddInstructionText: (clause: string) => void;
  onApplyDirectCleaning: (preview: CleaningPreviewResult) => void;
  onResetToOriginal: () => void;
}

const ORDERED_ISSUE_TYPES: IssueType[] = [
  'duplicate_rows',
  'missing_values',
  'empty_rows',
  'empty_columns',
  'extra_whitespace',
  'inconsistent_column_names',
  'inconsistent_formats',
  'invalid_numeric_values',
];

export const DataQualityPage: React.FC<DataQualityPageProps> = ({
  activeDataset,
  onNavigate,
  onApplyDirectCleaning,
  onResetToOriginal,
}) => {
  const [selectedIssueType, setSelectedIssueType] = useState<IssueType>('missing_values');

  // SECTION 1: Missing Values State per column
  const [missingActions, setMissingActions] = useState<Record<string, MissingValueActionType>>({});
  const [customMissingValues, setCustomMissingValues] = useState<Record<string, string>>({});
  const [missingSectionFeedback, setMissingSectionFeedback] = useState<string | null>(null);

  // SECTION 2: Duplicate Rows State
  const [duplicateMode, setDuplicateMode] = useState<DuplicateHandlingMode>('keep_unchanged');
  const [selectedDupColumns, setSelectedDupColumns] = useState<string[]>([]);
  const [duplicatePreviewBanner, setDuplicatePreviewBanner] = useState<string | null>(null);

  // SECTION 3: Custom Cleaning Instructions State
  const [panelInstructionText, setPanelInstructionText] = useState<string>('');
  const [analyzedInstructions, setAnalyzedInstructions] = useState<ParsedInstructionResult | null>(
    null
  );

  // SECTION 4 & 5: Preview, Apply & Download State
  const [livePreview, setLivePreview] = useState<CleaningPreviewResult | null>(null);
  const [beforeAfterTab, setBeforeAfterTab] = useState<'after' | 'before' | 'diffs'>('after');
  const [hasAppliedCleaningInPanel, setHasAppliedCleaningInPanel] = useState<boolean>(false);
  const [statusBanner, setStatusBanner] = useState<string | null>(null);

  // Sync column defaults when dataset changes
  useEffect(() => {
    if (!activeDataset) return;
    const initActions: Record<string, MissingValueActionType> = {};
    const initCustomVals: Record<string, string> = {};
    activeDataset.currentReport.columnProfiles.forEach((col) => {
      if (col.missingCount > 0) {
        initActions[col.name] = 'unchanged';
        initCustomVals[col.name] = '';
      }
    });
    setMissingActions(initActions);
    setCustomMissingValues((prev) => ({ ...initCustomVals, ...prev }));
    if (selectedDupColumns.length === 0 && activeDataset.currentColumns.length > 0) {
      setSelectedDupColumns([activeDataset.currentColumns[0]]);
    }
  }, [activeDataset?.id, activeDataset?.currentColumns.join('|')]);

  if (!activeDataset) {
    return (
      <div className="bg-white border border-slate-200 rounded-xl p-10 text-center space-y-4">
        <h1 className="text-xl font-bold text-slate-900 font-display">
          No Dataset Loaded for Quality Analysis
        </h1>
        <p className="text-sm text-slate-600 max-w-md mx-auto">
          Please upload a CSV or Excel (.xlsx) file first so DataTrustAI can analyze its rows,
          columns, and cell integrity and display the Custom Cleaning Panel.
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

  const report = activeDataset.currentReport;
  const selectedIssue = report.issues[selectedIssueType];

  // Actual columns containing missing values
  const columnsWithMissingValues = report.columnProfiles.filter(
    (col) => col.missingCount > 0 && col.inferredType !== 'empty'
  );

  // Calculate expected duplicate rows to be removed based on current Section 2 selection
  const expectedDuplicatesCount = useMemo(() => {
    if (duplicateMode === 'keep_unchanged') return 0;
    if (duplicateMode === 'remove_exact') return report.duplicateRowsCount;
    return countDuplicatesByColumns(
      activeDataset.currentRows,
      selectedDupColumns,
      activeDataset.currentColumns
    ).count;
  }, [
    duplicateMode,
    report.duplicateRowsCount,
    activeDataset.currentRows,
    activeDataset.currentColumns,
    selectedDupColumns,
  ]);

  // Build combined RecognizedOperation[] from Section 1, Section 2, and Section 3
  const buildCombinedOperations = (
    overrideInstructionResult?: ParsedInstructionResult | null
  ): { operations: RecognizedOperation[]; validationError: string | null } => {
    const ops: RecognizedOperation[] = [];

    // 1. Section 1: Missing Values per-column actions
    for (const colProf of columnsWithMissingValues) {
      const colName = colProf.name;
      const action = missingActions[colName] || 'unchanged';
      if (action === 'unchanged') continue;

      if (action === 'custom') {
        const customVal = (customMissingValues[colName] ?? '').trim();
        if (customVal === '') {
          return {
            operations: [],
            validationError: `Please enter a replacement value in the textbox for column "${colName}" before applying to preview.`,
          };
        }
        ops.push({
          id: `missing_custom_${colName}_${Date.now()}`,
          type: 'REPLACE_MISSING_VALUES',
          rawText: `Replace missing ${colName} values with ${customVal}`,
          title: `Replace Missing "${colName}" Values with "${customVal}"`,
          description: `Replaces ${colProf.missingCount} missing cell(s) in column "${colName}" with "${customVal}".`,
          targetColumn: colName,
          replacementValue: customVal,
          isDestructive: false,
        });
      } else if (action === 'unknown') {
        ops.push({
          id: `missing_unknown_${colName}_${Date.now()}`,
          type: 'REPLACE_MISSING_VALUES',
          rawText: `Replace missing ${colName} values with Unknown`,
          title: `Replace Missing "${colName}" Values with "Unknown"`,
          description: `Replaces ${colProf.missingCount} missing cell(s) in column "${colName}" with "Unknown".`,
          targetColumn: colName,
          replacementValue: 'Unknown',
          isDestructive: false,
        });
      } else if (action === 'zero') {
        ops.push({
          id: `missing_zero_${colName}_${Date.now()}`,
          type: 'REPLACE_MISSING_VALUES',
          rawText: `Replace missing ${colName} values with 0`,
          title: `Replace Missing "${colName}" Values with "0"`,
          description: `Replaces ${colProf.missingCount} missing cell(s) in column "${colName}" with "0".`,
          targetColumn: colName,
          replacementValue: '0',
          isDestructive: false,
        });
      } else if (action === 'mean') {
        const meanVal = calculateColumnMean(activeDataset.currentRows, colName);
        if (meanVal === null) {
          return {
            operations: [],
            validationError: `Column "${colName}" does not contain valid numeric values to calculate a mean.`,
          };
        }
        ops.push({
          id: `missing_mean_${colName}_${Date.now()}`,
          type: 'REPLACE_MISSING_VALUES',
          rawText: `Replace missing ${colName} values with column mean (${meanVal})`,
          title: `Replace Missing "${colName}" Values with Mean (${meanVal})`,
          description: `Replaces ${colProf.missingCount} missing cell(s) in numeric column "${colName}" with the calculated mean (${meanVal}).`,
          targetColumn: colName,
          replacementValue: meanVal,
          isDestructive: false,
        });
      } else if (action === 'median') {
        const medianVal = calculateColumnMedian(activeDataset.currentRows, colName);
        if (medianVal === null) {
          return {
            operations: [],
            validationError: `Column "${colName}" does not contain valid numeric values to calculate a median.`,
          };
        }
        ops.push({
          id: `missing_median_${colName}_${Date.now()}`,
          type: 'REPLACE_MISSING_VALUES',
          rawText: `Replace missing ${colName} values with column median (${medianVal})`,
          title: `Replace Missing "${colName}" Values with Median (${medianVal})`,
          description: `Replaces ${colProf.missingCount} missing cell(s) in numeric column "${colName}" with the calculated median (${medianVal}).`,
          targetColumn: colName,
          replacementValue: medianVal,
          isDestructive: false,
        });
      } else if (action === 'remove_rows') {
        ops.push({
          id: `missing_remove_${colName}_${Date.now()}`,
          type: 'REMOVE_MISSING_ROWS',
          rawText: `Remove rows containing missing values in ${colName}`,
          title: `Remove Rows with Missing "${colName}"`,
          description: `Removes rows where column "${colName}" has a missing or blank value.`,
          targetColumn: colName,
          isDestructive: true,
        });
      }
    }

    // 2. Section 2: Duplicate Rows handling
    if (duplicateMode === 'remove_exact') {
      ops.push({
        id: `dup_exact_${Date.now()}`,
        type: 'REMOVE_DUPLICATES',
        rawText: 'Remove all exact duplicate rows, keeping the first occurrence',
        title: 'Remove All Exact Duplicate Rows',
        description:
          'Removes rows that are identical across all columns, keeping the first occurrence.',
        isDestructive: false,
      });
    } else if (duplicateMode === 'remove_by_columns') {
      if (selectedDupColumns.length === 0) {
        return {
          operations: [],
          validationError:
            'Please select at least one column for "Remove duplicates based on selected columns".',
        };
      }
      ops.push({
        id: `dup_cols_${Date.now()}`,
        type: 'REMOVE_DUPLICATES_BY_COLUMNS',
        rawText: `Remove duplicates based on columns: ${selectedDupColumns.join(', ')}`,
        title: `Remove Duplicates Based on [${selectedDupColumns.join(', ')}]`,
        description: `Removes duplicate rows matching across selected column(s): ${selectedDupColumns.join(', ')}, keeping the first occurrence.`,
        targetColumns: selectedDupColumns,
        isDestructive: false,
      });
    }

    // 3. Section 3: Custom Cleaning Instructions
    const instrToUse =
      overrideInstructionResult !== undefined ? overrideInstructionResult : analyzedInstructions;
    if (instrToUse && instrToUse.recognized.length > 0) {
      ops.push(...instrToUse.recognized);
    } else if (panelInstructionText.trim().length > 0 && !instrToUse) {
      const parsedNow = parseCleaningInstructions(
        panelInstructionText,
        activeDataset.currentColumns
      );
      setAnalyzedInstructions(parsedNow);
      if (parsedNow.recognized.length > 0) {
        ops.push(...parsedNow.recognized);
      }
    }

    return { operations: ops, validationError: null };
  };

  // Trigger simulation for Preview
  const handleGeneratePreview = (
    overrideInstructionResult?: ParsedInstructionResult | null,
    feedbackMsg?: string
  ) => {
    setMissingSectionFeedback(null);
    const { operations, validationError } = buildCombinedOperations(overrideInstructionResult);
    if (validationError) {
      setMissingSectionFeedback(validationError);
      return;
    }

    const simulation = simulateCleaningOperations(
      activeDataset.currentColumns,
      activeDataset.currentRows,
      operations
    );
    setLivePreview(simulation);
    if (feedbackMsg) {
      setStatusBanner(feedbackMsg);
    }
  };

  // Section 3: Analyze Instructions handler
  const handleAnalyzeInstructions = () => {
    if (!panelInstructionText.trim()) {
      setAnalyzedInstructions({
        rawInput: '',
        recognized: [],
        unsupported: [
          {
            rawText: '(Empty instruction input)',
            reason: 'No instruction text was entered.',
            suggestion:
              'Enter an instruction such as: "Replace missing City values with Hyderabad, replace missing Age values with 0, remove duplicate rows, and trim extra spaces from all text columns."',
          },
        ],
      });
      return;
    }
    const parsed = parseCleaningInstructions(panelInstructionText, activeDataset.currentColumns);
    setAnalyzedInstructions(parsed);
    handleGeneratePreview(
      parsed,
      `Analyzed custom instructions: ${parsed.recognized.length} recognized operation(s).`
    );
  };

  // Section 4: Apply Cleaning handler
  const handleApplyCleaning = () => {
    const { operations, validationError } = buildCombinedOperations();
    if (validationError) {
      setMissingSectionFeedback(validationError);
      return;
    }
    const previewToCommit =
      livePreview && livePreview.operations.length > 0
        ? livePreview
        : simulateCleaningOperations(
            activeDataset.currentColumns,
            activeDataset.currentRows,
            operations
          );

    if (previewToCommit.operations.length === 0) {
      setMissingSectionFeedback(
        'Please select at least one cleaning action (Missing Values, Duplicate Rows, or Custom Instructions) before clicking Apply Cleaning.'
      );
      return;
    }

    onApplyDirectCleaning(previewToCommit);
    setHasAppliedCleaningInPanel(true);
    setLivePreview(null);
    setAnalyzedInstructions(null);
    setPanelInstructionText('');
    setDuplicateMode('keep_unchanged');
    setDuplicatePreviewBanner(null);
    setStatusBanner(
      `Cleaning applied! Dataset updated to ${previewToCommit.afterRows.length} rows (${previewToCommit.missingValuesReplaced} missing cells replaced, ${previewToCommit.duplicatesRemoved} duplicate rows removed). Download buttons are ready below.`
    );
  };

  // Section 4: Reset Changes handler
  const handleResetAllChanges = () => {
    onResetToOriginal();
    setLivePreview(null);
    setAnalyzedInstructions(null);
    setPanelInstructionText('');
    setDuplicateMode('keep_unchanged');
    setDuplicatePreviewBanner(null);
    setMissingSectionFeedback(null);
    setHasAppliedCleaningInPanel(false);
    const resetActions: Record<string, MissingValueActionType> = {};
    const resetCustom: Record<string, string> = {};
    activeDataset.originalColumns.forEach((c) => {
      resetActions[c] = 'unchanged';
      resetCustom[c] = '';
    });
    setMissingActions(resetActions);
    setCustomMissingValues(resetCustom);
    setStatusBanner(
      `Reset complete. Restored original uploaded dataset (${activeDataset.originalRows.length} rows) without modifications.`
    );
  };

  const highlightRowSet = useMemo(
    () => new Set(selectedIssue.affectedRowIndices),
    [selectedIssue.affectedRowIndices]
  );

  const highlightColSet = useMemo(
    () => new Set(selectedIssue.affectedColumns),
    [selectedIssue.affectedColumns]
  );

  const isCleanedAvailable =
    hasAppliedCleaningInPanel || activeDataset.history.length > 0;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 font-display">
            Data Quality Analysis &amp; Custom Cleaning Workspace
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Inspect detected issues on the left and configure your cleaning actions in the{' '}
            <span className="font-semibold text-slate-900">Customize Your Cleaning</span> panel on
            the right. Original data ({activeDataset.originalRows.length} rows) is preserved safely.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          {isCleanedAvailable && (
            <button
              type="button"
              onClick={() => onNavigate('cleaned')}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-teal-900 bg-teal-50 border border-teal-200 hover:bg-teal-100 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <span>View Full Cleaned Page</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Status Notification Banner */}
      {statusBanner && (
        <div
          role="status"
          className="bg-teal-50 border border-teal-200 rounded-xl px-4 py-3 flex items-center justify-between gap-4 text-xs text-teal-950"
        >
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-teal-600 shrink-0" />
            <span className="font-medium">{statusBanner}</span>
          </div>
          <button
            type="button"
            onClick={() => setStatusBanner(null)}
            className="font-semibold text-teal-800 hover:text-teal-950 cursor-pointer shrink-0"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* MAIN TWO-COLUMN WORKSPACE: Left = Data Quality Results, Right = Customize Your Cleaning Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT COLUMN (lg:col-span-7): Data-Quality Issues and Results */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div>
                <h2 className="text-base font-bold text-slate-900 font-display">
                  Detected Data-Quality Issues
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Active dataset: <span className="font-semibold">{activeDataset.fileName}</span> (
                  {report.totalRows} rows &times; {report.totalColumns} columns &middot; Health
                  Score: {report.qualityScore}%)
                </p>
              </div>
              <span className="text-xs font-mono text-slate-500 tabular-nums">
                Click any card to inspect
              </span>
            </div>

            {/* 8 Issue Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {ORDERED_ISSUE_TYPES.map((type) => {
                const item = report.issues[type];
                const isSelected = selectedIssueType === type;
                const hasIssues = item.count > 0;

                return (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setSelectedIssueType(type)}
                    className={`text-left p-4 rounded-xl border transition-all cursor-pointer flex flex-col justify-between space-y-2 ${
                      isSelected
                        ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                        : 'bg-slate-50/70 text-slate-900 border-slate-200 hover:border-slate-300 hover:bg-white'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <span
                        className={`text-xl font-bold font-mono tabular-nums ${
                          isSelected
                            ? 'text-white'
                            : hasIssues
                            ? 'text-slate-900'
                            : 'text-teal-700'
                        }`}
                      >
                        {item.count.toLocaleString()}
                      </span>
                      {hasIssues ? (
                        <AlertTriangle
                          className={`w-4 h-4 ${
                            isSelected ? 'text-amber-400' : 'text-amber-600'
                          }`}
                        />
                      ) : (
                        <CheckCircle2
                          className={`w-4 h-4 ${
                            isSelected ? 'text-teal-400' : 'text-teal-600'
                          }`}
                        />
                      )}
                    </div>

                    <div>
                      <div className="text-xs font-bold font-display leading-snug">
                        {item.title}
                      </div>
                      <p
                        className={`text-[11px] leading-relaxed mt-0.5 ${
                          isSelected ? 'text-slate-300' : 'text-slate-500'
                        }`}
                      >
                        {item.description}
                      </p>
                    </div>

                    <div
                      className={`pt-2 border-t text-[11px] flex items-center justify-between ${
                        isSelected
                          ? 'border-slate-800 text-teal-300'
                          : 'border-slate-200/80 text-slate-500'
                      }`}
                    >
                      <span>
                        {item.affectedRowIndices.length > 0
                          ? `${item.affectedRowIndices.length} row(s) affected`
                          : item.affectedColumns.length > 0
                          ? `${item.affectedColumns.length} col(s) affected`
                          : 'Clean (0 issues)'}
                      </span>
                      <span className="inline-flex items-center gap-1 font-medium">
                        <Eye className="w-3 h-3" />
                        <span>Inspect</span>
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Selected Issue Affected Rows & Cells Inspector */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900 font-display">
                  Inspecting: {selectedIssue.title} ({selectedIssue.count})
                </h3>
                <p className="text-xs text-slate-500">{selectedIssue.description}</p>
              </div>
              {selectedIssue.affectedColumns.length > 0 && (
                <span className="text-xs font-mono text-slate-600">
                  Columns: {selectedIssue.affectedColumns.join(', ')}
                </span>
              )}
            </div>

            {selectedIssue.count === 0 ? (
              <div className="p-6 text-center text-xs text-slate-600 bg-slate-50 rounded-lg border border-slate-200">
                Zero issues detected in <span className="font-semibold">{selectedIssue.title}</span>{' '}
                for the current dataset state.
              </div>
            ) : (
              selectedIssue.sampleCells.length > 0 && (
                <div className="overflow-x-auto border border-slate-200 rounded-lg max-h-52">
                  <table className="w-full text-left border-collapse text-xs font-mono tabular-nums">
                    <thead>
                      <tr className="bg-slate-100 border-b border-slate-200 text-slate-700 sticky top-0">
                        <th className="py-2 px-3 w-16">Row #</th>
                        <th className="py-2 px-3">Column</th>
                        <th className="py-2 px-3">Detected Value</th>
                        <th className="py-2 px-3 font-sans">Diagnostic Detail</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {selectedIssue.sampleCells.map((cell, i) => (
                        <tr key={i} className="hover:bg-slate-50">
                          <td className="py-1.5 px-3 text-slate-500">
                            {selectedIssue.type === 'empty_columns' ||
                            selectedIssue.type === 'inconsistent_column_names'
                              ? 'Header'
                              : `#${cell.rowIndex + 1}`}
                          </td>
                          <td className="py-1.5 px-3 font-semibold text-slate-900">
                            {cell.column}
                          </td>
                          <td className="py-1.5 px-3 text-amber-900 bg-amber-50/70">
                            {cell.value}
                          </td>
                          <td className="py-1.5 px-3 font-sans text-slate-600">{cell.detail}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )
            )}

            {/* Before-and-After or Active Dataset Inspection Table */}
            <div className="space-y-3 pt-2">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <h4 className="text-sm font-bold text-slate-900 font-display">
                  {livePreview
                    ? 'Before-and-After Data Preview'
                    : 'Current Dataset Table (Highlighted by Selected Issue)'}
                </h4>

                {livePreview && (
                  <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
                    <button
                      type="button"
                      onClick={() => setBeforeAfterTab('after')}
                      className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                        beforeAfterTab === 'after'
                          ? 'bg-white text-slate-900 shadow-sm'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      After Preview ({livePreview.afterRows.length} rows)
                    </button>
                    <button
                      type="button"
                      onClick={() => setBeforeAfterTab('before')}
                      className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                        beforeAfterTab === 'before'
                          ? 'bg-white text-slate-900 shadow-sm'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Before ({livePreview.beforeRows.length} rows)
                    </button>
                    <button
                      type="button"
                      onClick={() => setBeforeAfterTab('diffs')}
                      className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                        beforeAfterTab === 'diffs'
                          ? 'bg-white text-slate-900 shadow-sm'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Cell Changes ({livePreview.cellDiffs.length})
                    </button>
                  </div>
                )}
              </div>

              {livePreview ? (
                beforeAfterTab === 'diffs' ? (
                  <div className="overflow-x-auto border border-slate-200 rounded-lg max-h-80">
                    {livePreview.cellDiffs.length === 0 ? (
                      <div className="p-6 text-center text-xs text-slate-500">
                        No individual cell values replaced in this preview (or only row removals
                        selected). Switch to &ldquo;After Preview&rdquo; to inspect resulting rows.
                      </div>
                    ) : (
                      <table className="w-full text-left border-collapse text-xs font-mono tabular-nums">
                        <thead>
                          <tr className="bg-slate-100 border-b border-slate-200 text-slate-700 sticky top-0">
                            <th className="py-2 px-3 w-16">Row #</th>
                            <th className="py-2 px-3">Column</th>
                            <th className="py-2 px-3">Before</th>
                            <th className="py-2 px-3">After</th>
                            <th className="py-2 px-3 font-sans">Operation</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                          {livePreview.cellDiffs.map((d, index) => (
                            <tr key={index} className="hover:bg-slate-50">
                              <td className="py-1.5 px-3 text-slate-500">#{d.rowIndex + 1}</td>
                              <td className="py-1.5 px-3 font-semibold text-slate-900">
                                {d.column}
                              </td>
                              <td className="py-1.5 px-3 text-rose-800 bg-rose-50/60">
                                {d.beforeValue}
                              </td>
                              <td className="py-1.5 px-3 text-teal-800 bg-teal-50/70 font-semibold">
                                {d.afterValue}
                              </td>
                              <td className="py-1.5 px-3 font-sans text-slate-600">
                                {d.operationTitle}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                ) : beforeAfterTab === 'after' ? (
                  <DataTableView
                    columns={livePreview.afterColumns}
                    rows={livePreview.afterRows}
                    showWhitespaceMarkers={true}
                  />
                ) : (
                  <DataTableView
                    columns={livePreview.beforeColumns}
                    rows={livePreview.beforeRows}
                    showWhitespaceMarkers={true}
                  />
                )
              ) : (
                <DataTableView
                  columns={activeDataset.currentColumns}
                  rows={activeDataset.currentRows}
                  highlightRowIndices={highlightRowSet}
                  highlightColumns={highlightColSet}
                  showWhitespaceMarkers={true}
                />
              )}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN (lg:col-span-5): CUSTOM CLEANING PANEL ("Customize Your Cleaning") */}
        <div className="lg:col-span-5 bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
          {/* Panel Header */}
          <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Sliders className="w-4 h-4 text-teal-400 shrink-0" />
              <h2 className="text-base font-bold font-display tracking-tight">
                Customize Your Cleaning
              </h2>
            </div>
            <span className="text-[11px] font-mono text-teal-400">
              Non-Destructive Workspace
            </span>
          </div>

          <div className="p-6 space-y-7 divide-y divide-slate-200">
            {/* ================================================================= */}
            {/* SECTION 1 — MISSING VALUES                                        */}
            {/* ================================================================= */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 font-display">
                    1. Missing Values
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Select how to handle missing cells for each affected column
                  </p>
                </div>
                <span className="text-xs font-mono font-semibold text-slate-700 tabular-nums">
                  {report.missingValuesCount} missing total
                </span>
              </div>

              {missingSectionFeedback && (
                <div
                  role="alert"
                  className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-900 flex items-start gap-2"
                >
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <span>{missingSectionFeedback}</span>
                </div>
              )}

              {columnsWithMissingValues.length === 0 ? (
                <div className="p-4 rounded-lg bg-teal-50/60 border border-teal-200 text-xs text-teal-900 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-teal-600 shrink-0" />
                  <span>
                    Zero columns currently contain missing values in this dataset state.
                  </span>
                </div>
              ) : (
                <div className="space-y-3.5">
                  {columnsWithMissingValues.map((colProf) => {
                    const colName = colProf.name;
                    const currentAction = missingActions[colName] || 'unchanged';
                    const isNumericCol = colProf.inferredType === 'numeric';
                    const meanVal = isNumericCol
                      ? calculateColumnMean(activeDataset.currentRows, colName)
                      : null;
                    const medianVal = isNumericCol
                      ? calculateColumnMedian(activeDataset.currentRows, colName)
                      : null;

                    return (
                      <div
                        key={colName}
                        className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 space-y-3"
                      >
                        <div className="flex items-center justify-between text-xs">
                          <div>
                            <span className="text-slate-500">Column:</span>{' '}
                            <span className="font-mono font-bold text-slate-900">{colName}</span>
                            <span className="ml-2 text-[11px] text-slate-500">
                              ({colProf.inferredType})
                            </span>
                          </div>
                          <div className="font-mono font-semibold text-amber-800 tabular-nums">
                            Missing values: {colProf.missingCount}
                          </div>
                        </div>

                        <div className="space-y-2">
                          <label
                            htmlFor={`missing-action-${colName}`}
                            className="block text-[11px] font-semibold text-slate-600"
                          >
                            Action
                          </label>
                          <select
                            id={`missing-action-${colName}`}
                            value={currentAction}
                            onChange={(e) => {
                              const nextAction = e.target.value as MissingValueActionType;
                              setMissingActions((prev) => ({
                                ...prev,
                                [colName]: nextAction,
                              }));
                              setMissingSectionFeedback(null);
                            }}
                            className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:border-sky-600"
                          >
                            <option value="unchanged">Leave unchanged</option>
                            <option value="custom">Replace with a custom value</option>
                            <option value="unknown">Replace with &quot;Unknown&quot;</option>
                            <option value="zero">Replace with 0</option>
                            {isNumericCol && (
                              <option value="mean">
                                Replace with the column&apos;s mean
                                {meanVal !== null ? ` (${meanVal})` : ''}
                              </option>
                            )}
                            {isNumericCol && (
                              <option value="median">
                                Replace with the column&apos;s median
                                {medianVal !== null ? ` (${medianVal})` : ''}
                              </option>
                            )}
                            <option value="remove_rows">
                              Remove rows containing missing values
                            </option>
                          </select>
                        </div>

                        {/* When "Replace with a custom value" is selected, show textbox beside option + Apply to Preview button */}
                        {currentAction === 'custom' ? (
                          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pt-1">
                            <input
                              type="text"
                              value={customMissingValues[colName] ?? ''}
                              onChange={(e) =>
                                setCustomMissingValues((prev) => ({
                                  ...prev,
                                  [colName]: e.target.value,
                                }))
                              }
                              placeholder="Enter replacement value (e.g. Hyderabad, Unknown, 0)"
                              aria-label={`Enter replacement value for ${colName}`}
                              className="flex-1 px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-sky-600"
                            />
                            <button
                              type="button"
                              onClick={() =>
                                handleGeneratePreview(
                                  undefined,
                                  `Applied custom replacement "${(customMissingValues[colName] ?? '').trim()}" for column "${colName}" to preview.`
                                )
                              }
                              className="px-3.5 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                            >
                              Apply to Preview
                            </button>
                          </div>
                        ) : (
                          currentAction !== 'unchanged' && (
                            <div className="flex justify-end pt-1">
                              <button
                                type="button"
                                onClick={() =>
                                  handleGeneratePreview(
                                    undefined,
                                    `Updated preview with missing-value strategy for "${colName}".`
                                  )
                                }
                                className="px-3 py-1.5 text-xs font-semibold text-sky-700 bg-sky-50 border border-sky-200 hover:bg-sky-100 rounded-lg transition-colors cursor-pointer"
                              >
                                Apply to Preview
                              </button>
                            </div>
                          )
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* ================================================================= */}
            {/* SECTION 2 — DUPLICATE ROWS                                        */}
            {/* ================================================================= */}
            <div className="pt-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 font-display">
                    2. Duplicate Rows
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Configure duplicate detection and preview row removal
                  </p>
                </div>
                <span className="text-xs font-mono font-semibold text-slate-700 tabular-nums">
                  {report.duplicateRowsCount} exact duplicate(s)
                </span>
              </div>

              <div className="space-y-2.5 text-xs">
                <label className="flex items-start gap-2.5 p-2.5 rounded-lg border border-slate-200 bg-slate-50/60 cursor-pointer hover:bg-slate-50">
                  <input
                    type="radio"
                    name="duplicate-mode"
                    checked={duplicateMode === 'remove_exact'}
                    onChange={() => setDuplicateMode('remove_exact')}
                    className="mt-0.5 text-sky-600 focus:ring-sky-600"
                  />
                  <span>
                    Remove all exact duplicate rows, keeping the first occurrence.
                  </span>
                </label>

                <label className="flex items-start gap-2.5 p-2.5 rounded-lg border border-slate-200 bg-slate-50/60 cursor-pointer hover:bg-slate-50">
                  <input
                    type="radio"
                    name="duplicate-mode"
                    checked={duplicateMode === 'remove_by_columns'}
                    onChange={() => setDuplicateMode('remove_by_columns')}
                    className="mt-0.5 text-sky-600 focus:ring-sky-600"
                  />
                  <span>Remove duplicates based on selected columns.</span>
                </label>

                {duplicateMode === 'remove_by_columns' && (
                  <div className="ml-6 p-3 rounded-lg border border-slate-200 bg-white space-y-2">
                    <div className="text-[11px] font-semibold text-slate-600">
                      Select one or more columns to determine duplicates:
                    </div>
                    <div className="grid grid-cols-2 gap-2 max-h-36 overflow-y-auto">
                      {activeDataset.currentColumns.map((col) => {
                        const checked = selectedDupColumns.includes(col);
                        return (
                          <label
                            key={col}
                            className="inline-flex items-center gap-2 text-xs font-mono text-slate-800 cursor-pointer truncate"
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedDupColumns((prev) => [...prev, col]);
                                } else {
                                  setSelectedDupColumns((prev) =>
                                    prev.filter((c) => c !== col)
                                  );
                                }
                              }}
                              className="rounded border-slate-300 text-sky-600 focus:ring-sky-600"
                            />
                            <span className="truncate">{col}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                )}

                <label className="flex items-start gap-2.5 p-2.5 rounded-lg border border-slate-200 bg-slate-50/60 cursor-pointer hover:bg-slate-50">
                  <input
                    type="radio"
                    name="duplicate-mode"
                    checked={duplicateMode === 'keep_unchanged'}
                    onChange={() => setDuplicateMode('keep_unchanged')}
                    className="mt-0.5 text-sky-600 focus:ring-sky-600"
                  />
                  <span>Keep duplicates unchanged.</span>
                </label>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
                <div className="text-xs text-slate-600 font-mono tabular-nums">
                  Rows that will be removed:{' '}
                  <span className="font-bold text-slate-900">{expectedDuplicatesCount}</span>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setDuplicatePreviewBanner(
                      `Duplicate Removal Preview: ${expectedDuplicatesCount} row(s) will be removed.`
                    );
                    handleGeneratePreview(
                      undefined,
                      `Previewed duplicate removal: ${expectedDuplicatesCount} duplicate row(s) scheduled for removal.`
                    );
                  }}
                  className="px-3.5 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  Preview Duplicate Removal
                </button>
              </div>

              {duplicatePreviewBanner && (
                <div className="p-2.5 rounded-lg bg-sky-50 border border-sky-200 text-xs text-sky-900 font-medium">
                  {duplicatePreviewBanner}
                </div>
              )}
            </div>

            {/* ================================================================= */}
            {/* SECTION 3 — CUSTOM CLEANING INSTRUCTIONS                          */}
            {/* ================================================================= */}
            <div className="pt-6 space-y-4">
              <div>
                <label
                  htmlFor="panel-custom-instructions"
                  className="block text-sm font-bold text-slate-900 font-display"
                >
                  Tell DataTrustAI What to Change
                </label>
                <p className="text-xs text-slate-500 mt-0.5">
                  Write supported rule instructions and click Analyze Instructions to review
                </p>
              </div>

              <textarea
                id="panel-custom-instructions"
                rows={4}
                value={panelInstructionText}
                onChange={(e) => setPanelInstructionText(e.target.value)}
                placeholder="Example: Replace missing City values with Hyderabad, replace missing Age values with 0, remove duplicate rows, and trim extra spaces from all text columns."
                className="w-full p-3 text-xs font-mono bg-slate-50 border border-slate-300 rounded-xl text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:border-sky-600 leading-relaxed"
              />

              <div className="flex flex-wrap items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const sampleCmd =
                      'Replace missing City values with Hyderabad, replace missing Age values with 0, remove duplicate rows, and trim extra spaces from all text columns.';
                    setPanelInstructionText(sampleCmd);
                  }}
                  className="text-[11px] font-medium text-sky-700 hover:text-sky-800 underline underline-offset-4 cursor-pointer"
                >
                  Insert Example Instruction
                </button>

                <button
                  type="button"
                  onClick={handleAnalyzeInstructions}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5 text-teal-400" />
                  <span>Analyze Instructions</span>
                </button>
              </div>

              {/* Recognized & Unsupported Instructions Output */}
              {analyzedInstructions && (
                <div className="space-y-3 pt-1">
                  {analyzedInstructions.recognized.length > 0 && (
                    <div className="p-3.5 rounded-xl bg-teal-50/70 border border-teal-200 space-y-2">
                      <div className="text-xs font-bold text-teal-950 flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4 text-teal-600 shrink-0" />
                        <span>
                          Recognized Operations ({analyzedInstructions.recognized.length})
                        </span>
                      </div>
                      <ul className="space-y-1.5 text-xs text-teal-900">
                        {analyzedInstructions.recognized.map((op, i) => (
                          <li key={op.id} className="font-medium">
                            {i + 1}. {op.title}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {analyzedInstructions.unsupported.length > 0 && (
                    <div
                      role="alert"
                      className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 space-y-2 text-xs text-rose-950"
                    >
                      <div className="font-bold flex items-center gap-1.5">
                        <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                        <span>
                          Ambiguous or Unsupported Instructions (
                          {analyzedInstructions.unsupported.length})
                        </span>
                      </div>
                      {analyzedInstructions.unsupported.map((u, i) => (
                        <div key={i} className="p-2.5 rounded-lg bg-white border border-rose-200 space-y-1">
                          <div className="font-mono font-semibold text-rose-900">
                            &ldquo;{u.rawText}&rdquo;
                          </div>
                          <p className="text-slate-700">{u.reason}</p>
                          <p className="text-teal-800 font-medium">{u.suggestion}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* ================================================================= */}
            {/* SECTION 4 — PREVIEW AND APPLY                                     */}
            {/* ================================================================= */}
            <div className="pt-6 space-y-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900 font-display">
                  4. Preview and Apply
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Verify expected row and cell counts before applying cleaning
                </p>
              </div>

              {/* Expected Metrics Grid */}
              <div className="grid grid-cols-2 gap-3 font-mono text-xs tabular-nums">
                <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                  <div className="font-sans text-[11px] text-slate-500">Original Row Count</div>
                  <div className="text-base font-bold text-slate-900 mt-0.5">
                    {activeDataset.originalRows.length}
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                  <div className="font-sans text-[11px] text-slate-500">
                    Expected Cleaned Row Count
                  </div>
                  <div className="text-base font-bold text-teal-700 mt-0.5">
                    {livePreview ? livePreview.afterRows.length : activeDataset.currentRows.length}
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                  <div className="font-sans text-[11px] text-slate-500">
                    Missing Cells to Replace
                  </div>
                  <div className="text-base font-bold text-sky-700 mt-0.5">
                    {livePreview ? livePreview.missingValuesReplaced : 0}
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                  <div className="font-sans text-[11px] text-slate-500">
                    Duplicate Rows to Remove
                  </div>
                  <div className="text-base font-bold text-amber-700 mt-0.5">
                    {livePreview ? livePreview.duplicatesRemoved : expectedDuplicatesCount}
                  </div>
                </div>
              </div>

              {/* Three Required Buttons: Preview Changes, Apply Cleaning, Reset Changes */}
              <div className="flex flex-wrap items-center gap-2.5 pt-1">
                <button
                  type="button"
                  onClick={() =>
                    handleGeneratePreview(
                      undefined,
                      'Generated before-and-after preview. Inspect the table on the left.'
                    )
                  }
                  className="flex-1 inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 text-xs font-semibold text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors whitespace-nowrap cursor-pointer"
                >
                  <Play className="w-3.5 h-3.5 text-sky-700" />
                  <span>Preview Changes</span>
                </button>

                <button
                  type="button"
                  onClick={handleApplyCleaning}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 px-4 py-2.5 text-xs font-semibold text-white bg-teal-600 hover:bg-teal-700 rounded-lg transition-colors whitespace-nowrap cursor-pointer"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Apply Cleaning</span>
                </button>

                <button
                  type="button"
                  onClick={handleResetAllChanges}
                  className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 text-xs font-semibold text-rose-700 bg-rose-50 border border-rose-200 hover:bg-rose-100 rounded-lg transition-colors whitespace-nowrap cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reset Changes</span>
                </button>
              </div>
            </div>

            {/* ================================================================= */}
            {/* SECTION 5 — DOWNLOAD                                              */}
            {/* ================================================================= */}
            <div className="pt-6 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 font-display">
                    5. Download Cleaned Dataset
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {isCleanedAvailable
                      ? 'Your cleaned dataset is ready for CSV and Excel (.xlsx) export.'
                      : 'Click "Apply Cleaning" above to enable cleaned file downloads.'}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <button
                  type="button"
                  disabled={!isCleanedAvailable}
                  onClick={() => {
                    downloadCleanedCSV(
                      activeDataset.currentColumns,
                      activeDataset.currentRows,
                      activeDataset.fileName
                    );
                    setStatusBanner(
                      `Downloaded Cleaned CSV (${activeDataset.currentRows.length} rows).`
                    );
                  }}
                  className="inline-flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors disabled:opacity-40 disabled:pointer-events-none cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5 text-teal-400" />
                  <span>Download Cleaned CSV</span>
                </button>

                <button
                  type="button"
                  disabled={!isCleanedAvailable}
                  onClick={() => {
                    downloadCleanedXLSX(
                      activeDataset.currentColumns,
                      activeDataset.currentRows,
                      activeDataset.fileName
                    );
                    setStatusBanner(
                      `Downloaded Cleaned Excel (.xlsx) (${activeDataset.currentRows.length} rows).`
                    );
                  }}
                  className="inline-flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-semibold text-white bg-sky-600 hover:bg-sky-700 rounded-lg transition-colors disabled:opacity-40 disabled:pointer-events-none cursor-pointer"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  <span>Download Cleaned Excel</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
