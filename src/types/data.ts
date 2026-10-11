export type PageId =
  | 'landing'
  | 'dashboard'
  | 'upload'
  | 'quality'
  | 'instructions'
  | 'review'
  | 'cleaned'
  | 'history';

export type DataRow = Record<string, string>;

export type IssueType =
  | 'duplicate_rows'
  | 'missing_values'
  | 'empty_rows'
  | 'empty_columns'
  | 'extra_whitespace'
  | 'inconsistent_column_names'
  | 'inconsistent_formats'
  | 'invalid_numeric_values';

export interface AffectedCell {
  rowIndex: number; // 0-based index in dataset
  column: string;
  value: string;
  detail: string;
}

export interface IssueCategoryReport {
  type: IssueType;
  title: string;
  description: string;
  count: number;
  severity: 'high' | 'medium' | 'low';
  affectedRowIndices: number[];
  affectedColumns: string[];
  sampleCells: AffectedCell[];
  suggestedInstruction: string;
}

export interface ColumnProfile {
  name: string;
  inferredType: 'numeric' | 'date' | 'boolean' | 'text' | 'empty';
  nonEmptyCount: number;
  missingCount: number;
  uniqueCount: number;
  whitespaceCount: number;
  invalidNumericCount: number;
  formatInconsistencyDetail?: string;
  isNameInconsistent: boolean;
  suggestedStandardName: string;
}

export interface DataQualityReport {
  totalRows: number;
  totalColumns: number;
  totalCells: number;
  qualityScore: number; // 0 to 100
  duplicateRowsCount: number;
  missingValuesCount: number;
  emptyRowsCount: number;
  emptyColumnsCount: number;
  extraWhitespaceCount: number;
  inconsistentColumnNamesCount: number;
  inconsistentFormatsCount: number;
  invalidNumericValuesCount: number;
  issues: Record<IssueType, IssueCategoryReport>;
  columnProfiles: ColumnProfile[];
}

export type OperationType =
  | 'REMOVE_DUPLICATES'
  | 'REMOVE_DUPLICATES_BY_COLUMNS'
  | 'TRIM_WHITESPACE'
  | 'LOWERCASE_COLUMNS'
  | 'UPPERCASE_COLUMNS'
  | 'STANDARDIZE_COLUMNS'
  | 'REMOVE_EMPTY_ROWS'
  | 'REMOVE_EMPTY_COLUMNS'
  | 'REPLACE_MISSING_VALUES'
  | 'REMOVE_MISSING_ROWS'
  | 'CONVERT_COLUMN_TYPE';

export type MissingValueActionType =
  | 'unchanged'
  | 'custom'
  | 'unknown'
  | 'zero'
  | 'mean'
  | 'median'
  | 'remove_rows';

export type DuplicateHandlingMode =
  | 'remove_exact'
  | 'remove_by_columns'
  | 'keep_unchanged';

export type SupportedTargetType =
  | 'number'
  | 'integer'
  | 'float'
  | 'date'
  | 'boolean'
  | 'uppercase'
  | 'lowercase'
  | 'titlecase'
  | 'text';

export interface RecognizedOperation {
  id: string;
  type: OperationType;
  rawText: string;
  title: string;
  description: string;
  targetColumn?: string;
  targetColumns?: string[];
  replacementValue?: string;
  targetDataType?: SupportedTargetType;
  isDestructive: boolean;
}

export interface UnsupportedInstruction {
  rawText: string;
  reason: string;
  suggestion: string;
}

export interface ParsedInstructionResult {
  rawInput: string;
  recognized: RecognizedOperation[];
  unsupported: UnsupportedInstruction[];
}

export interface CellDiff {
  rowIndex: number; // index in before dataset
  column: string;
  beforeValue: string;
  afterValue: string;
  operationTitle: string;
}

export interface ColumnChange {
  beforeName: string;
  afterName: string | null; // null if removed
  changeType: 'renamed' | 'removed' | 'unchanged';
}

export interface RemovedRowRecord {
  originalRowIndex: number;
  row: DataRow;
  reason: string;
}

export interface OperationExecutionMetric {
  operationId: string;
  operationType: OperationType;
  title: string;
  description: string;
  affectedRowsCount: number;
  affectedCellsCount: number;
}

export interface CleaningPreviewResult {
  operations: RecognizedOperation[];
  operationMetrics: OperationExecutionMetric[];
  beforeColumns: string[];
  afterColumns: string[];
  beforeRows: DataRow[];
  afterRows: DataRow[];
  columnChanges: ColumnChange[];
  cellDiffs: CellDiff[];
  removedRows: RemovedRowRecord[];
  totalAffectedRows: number;
  totalAffectedCells: number;
  duplicatesRemoved: number;
  emptyRowsRemoved: number;
  missingRowsRemoved: number;
  missingValuesReplaced: number;
  whitespaceTrimmedCount: number;
  typeConversionsCount: number;
  destructiveWarnings: string[];
}

export interface ChangeHistoryEntry {
  id: string;
  timestamp: string;
  operationName: string;
  description: string;
  affectedRows: number;
  affectedCells: number;
  operationsApplied: RecognizedOperation[];
  snapshotColumns: string[];
  snapshotRows: DataRow[];
  metricsSummary: {
    beforeRowCount: number;
    afterRowCount: number;
    duplicatesRemoved: number;
    missingValuesHandled: number;
    columnsChanged: number;
  };
}

export interface SessionDatasetRecord {
  id: string;
  fileName: string;
  fileSize: number;
  fileType: 'CSV' | 'XLSX';
  uploadedAt: string;
  originalColumns: string[];
  originalRows: DataRow[];
  currentColumns: string[];
  currentRows: DataRow[];
  initialReport: DataQualityReport;
  currentReport: DataQualityReport;
  history: ChangeHistoryEntry[];
  lastCleaningSummary?: {
    originalRowCount: number;
    cleanedRowCount: number;
    duplicatesRemoved: number;
    missingValuesHandled: number;
    columnChanges: ColumnChange[];
    operationsPerformed: OperationExecutionMetric[];
  };
}
