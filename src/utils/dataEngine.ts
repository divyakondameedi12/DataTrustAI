import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import {
  AffectedCell,
  CellDiff,
  CleaningPreviewResult,
  ColumnChange,
  ColumnProfile,
  DataQualityReport,
  DataRow,
  IssueCategoryReport,
  IssueType,
  OperationExecutionMetric,
  ParsedInstructionResult,
  RecognizedOperation,
  RemovedRowRecord,
  SupportedTargetType,
  UnsupportedInstruction,
} from '../types/data';

export const MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024; // 25 MB

/**
 * Helper to check if a cell value is empty or blank
 */
export function isBlank(val: string | undefined | null): boolean {
  if (val === undefined || val === null) return true;
  return String(val).trim() === '';
}

/**
 * Check if a string has leading/trailing whitespace or 2+ consecutive internal spaces
 */
export function hasExtraWhitespace(val: string | undefined | null): boolean {
  if (val === undefined || val === null || val === '') return false;
  const s = String(val);
  if (s !== s.trim()) return true;
  if (/\s{2,}/.test(s)) return true;
  return false;
}

/**
 * Normalize whitespace in a string: trim and collapse multiple internal spaces
 */
export function normalizeWhitespace(val: string): string {
  return String(val).trim().replace(/\s{2,}/g, ' ');
}

/**
 * Convert a column name into standardized snake_case
 */
export function toStandardColumnName(col: string, index: number): string {
  const cleaned = col
    .trim()
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .replace(/[^a-zA-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .toLowerCase();
  return cleaned || `column_${index + 1}`;
}

/**
 * Check if a column name has inconsistent formatting (spaces, mixed case with punctuation, leading/trailing spaces)
 */
export function isColumnNameInconsistent(col: string, allColumns: string[]): boolean {
  if (col !== col.trim()) return true;
  if (/\s/.test(col)) return true;
  if (/[^a-zA-Z0-9_]/.test(col)) return true;
  // Also check if some columns are lowercase and others have mixed uppercase/camelCase
  const isAllLower = /^[a-z0-9_]+$/.test(col);
  const isAllUpper = /^[A-Z0-9_]+$/.test(col);
  if (!isAllLower && !isAllUpper) return true;

  // Check if dataset mixes ALL_CAPS and all_lower across columns
  const hasLowerCols = allColumns.some((c) => /^[a-z0-9_]+$/.test(c));
  const hasUpperCols = allColumns.some((c) => /^[A-Z0-9_]+$/.test(c));
  if (hasLowerCols && hasUpperCols && isAllUpper) return true;

  return false;
}

/**
 * Test if a string can be parsed as a clean finite number (allowing optional currency/commas for numeric detection)
 */
export function isStrictNumber(val: string): boolean {
  const trimmed = val.trim();
  if (!trimmed) return false;
  return /^-?\d+(\.\d+)?$/.test(trimmed);
}

export function isFormattedNumberLike(val: string): boolean {
  const trimmed = val.trim();
  if (!trimmed) return false;
  // Matches currency or comma numbers like $1,200.50 or 1,200
  const stripped = trimmed.replace(/^[$€£¥₹\s]+|[,%\s]+$/g, '').replace(/,/g, '');
  return /^-?\d+(\.\d+)?$/.test(stripped);
}

/**
 * Extract valid numeric values from a column for mean/median calculation
 */
export function extractNumericValues(rows: DataRow[], col: string): number[] {
  const nums: number[] = [];
  rows.forEach((row) => {
    const raw = (row[col] ?? '').trim();
    if (!raw) return;
    const stripped = raw.replace(/^[$€£¥₹\s]+|[,%\s]+$/g, '').replace(/,/g, '');
    if (/^-?\d+(\.\d+)?$/.test(stripped)) {
      const n = Number(stripped);
      if (Number.isFinite(n)) {
        nums.push(n);
      }
    }
  });
  return nums;
}

/**
 * Calculate the arithmetic mean of a numeric column
 */
export function calculateColumnMean(rows: DataRow[], col: string): string | null {
  const nums = extractNumericValues(rows, col);
  if (nums.length === 0) return null;
  const sum = nums.reduce((acc, val) => acc + val, 0);
  const mean = sum / nums.length;
  return String(Number(mean.toFixed(2)));
}

/**
 * Calculate the median of a numeric column
 */
export function calculateColumnMedian(rows: DataRow[], col: string): string | null {
  const nums = extractNumericValues(rows, col).sort((a, b) => a - b);
  if (nums.length === 0) return null;
  const mid = Math.floor(nums.length / 2);
  const median =
    nums.length % 2 !== 0 ? nums[mid] : (nums[mid - 1] + nums[mid]) / 2;
  return String(Number(median.toFixed(2)));
}

/**
 * Count duplicate rows based on a selected subset of columns (keeping first occurrence)
 */
export function countDuplicatesByColumns(
  rows: DataRow[],
  selectedColumns: string[],
  allColumns: string[]
): { count: number; duplicateRowIndices: number[] } {
  const colsToUse = selectedColumns.length > 0 ? selectedColumns : allColumns;
  if (colsToUse.length === 0) {
    return { count: 0, duplicateRowIndices: [] };
  }
  const seen = new Set<string>();
  const duplicateRowIndices: number[] = [];

  rows.forEach((row, idx) => {
    // Ignore completely empty rows
    const isRowEmpty = allColumns.every((c) => isBlank(row[c]));
    if (isRowEmpty) return;

    const sig = colsToUse.map((c) => (row[c] ?? '').trim()).join('\u0001');
    if (seen.has(sig)) {
      duplicateRowIndices.push(idx);
    } else {
      seen.add(sig);
    }
  });

  return { count: duplicateRowIndices.length, duplicateRowIndices };
}

/**
 * Detect date format pattern for format consistency checking
 */
export function detectDatePattern(val: string): string | null {
  const s = val.trim();
  if (!s) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return 'YYYY-MM-DD';
  if (/^\d{4}\/\d{2}\/\d{2}$/.test(s)) return 'YYYY/MM/DD';
  if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(s)) return 'MM/DD/YYYY';
  if (/^\d{1,2}-\d{1,2}-\d{4}$/.test(s)) return 'DD-MM-YYYY';
  if (/^[A-Za-z]{3,9}\s+\d{1,2},?\s+\d{4}$/.test(s)) return 'Month DD, YYYY';
  if (/^\d{1,2}\s+[A-Za-z]{3,9}\s+\d{4}$/.test(s)) return 'DD Month YYYY';
  return null;
}

/**
 * Parse an uploaded File (CSV or XLSX/XLS) locally in the browser
 */
export async function parseUploadedFile(file: File): Promise<{
  columns: string[];
  rows: DataRow[];
  fileType: 'CSV' | 'XLSX';
}> {
  if (!file) {
    throw new Error('No file was provided.');
  }

  if (file.size === 0) {
    throw new Error('The uploaded file is empty (0 bytes). Please upload a valid CSV or Excel file with data.');
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    const sizeMB = (file.size / (1024 * 1024)).toFixed(1);
    throw new Error(`File size (${sizeMB} MB) exceeds the 25 MB browser processing limit.`);
  }

  const fileName = file.name.toLowerCase();
  const isCSV = fileName.endsWith('.csv');
  const isExcel = fileName.endsWith('.xlsx') || fileName.endsWith('.xls');

  if (!isCSV && !isExcel) {
    throw new Error(
      `Unsupported file format "${file.name}". Please upload a valid .csv or .xlsx file.`
    );
  }

  if (isCSV) {
    const text = await file.text();
    if (!text || text.trim().length === 0) {
      throw new Error('The CSV file contains no text content.');
    }
    return parseCSVText(text);
  } else {
    const buffer = await file.arrayBuffer();
    return parseExcelBuffer(buffer);
  }
}

/**
 * Parse raw CSV string into columns and DataRow[]
 * Keeps empty rows inside the dataset so Data Quality Analysis can detect and count them accurately!
 */
export function parseCSVText(csvText: string): {
  columns: string[];
  rows: DataRow[];
  fileType: 'CSV';
} {
  // Remove trailing single newline at very end of file so standard EOF newline isn't treated as an empty row
  const normalizedText = csvText.replace(/\r\n/g, '\n').replace(/\n$/, '');

  const parsed = Papa.parse<string[]>(normalizedText, {
    skipEmptyLines: false,
  });

  if (!parsed.data || parsed.data.length === 0) {
    throw new Error('Could not parse any rows from the CSV file.');
  }

  const rawHeaderRow = parsed.data[0];
  if (!rawHeaderRow || rawHeaderRow.every((cell) => isBlank(cell))) {
    throw new Error('The CSV file is missing a valid header row on line 1.');
  }

  // Ensure unique column identifiers while preserving raw column names
  const seenHeaders = new Map<string, number>();
  const columns: string[] = rawHeaderRow.map((col, idx) => {
    const baseName = col !== undefined && col !== null && col !== '' ? String(col) : `Column_${idx + 1}`;
    const count = seenHeaders.get(baseName) || 0;
    seenHeaders.set(baseName, count + 1);
    return count === 0 ? baseName : `${baseName}_${count + 1}`;
  });

  const dataRowsRaw = parsed.data.slice(1);
  if (dataRowsRaw.length === 0) {
    throw new Error('The file contains column headers but 0 data rows.');
  }

  const rows: DataRow[] = dataRowsRaw.map((rawRow) => {
    const rowObj: DataRow = {};
    columns.forEach((col, colIdx) => {
      const val = rawRow[colIdx];
      rowObj[col] = val !== undefined && val !== null ? String(val) : '';
    });
    return rowObj;
  });

  return { columns, rows, fileType: 'CSV' };
}

/**
 * Parse Excel ArrayBuffer into columns and DataRow[]
 */
export function parseExcelBuffer(buffer: ArrayBuffer): {
  columns: string[];
  rows: DataRow[];
  fileType: 'XLSX';
} {
  let workbook: XLSX.WorkBook;
  try {
    workbook = XLSX.read(buffer, { type: 'array', raw: false });
  } catch {
    throw new Error('Failed to read Excel file. The file may be corrupted or password-protected.');
  }

  const firstSheetName = workbook.SheetNames[0];
  if (!firstSheetName) {
    throw new Error('The Excel workbook contains no sheets.');
  }

  const worksheet = workbook.Sheets[firstSheetName];
  const rawMatrix = XLSX.utils.sheet_to_json<string[]>(worksheet, {
    header: 1,
    defval: '',
    blankrows: true,
    raw: false,
  });

  if (!rawMatrix || rawMatrix.length === 0) {
    throw new Error('The selected Excel worksheet is completely empty.');
  }

  const rawHeaderRow = rawMatrix[0];
  if (!rawHeaderRow || rawHeaderRow.every((cell) => isBlank(cell))) {
    throw new Error('The Excel worksheet is missing a valid header row in row 1.');
  }

  const seenHeaders = new Map<string, number>();
  const columns: string[] = rawHeaderRow.map((col, idx) => {
    const baseName = col !== undefined && col !== null && String(col) !== '' ? String(col) : `Column_${idx + 1}`;
    const count = seenHeaders.get(baseName) || 0;
    seenHeaders.set(baseName, count + 1);
    return count === 0 ? baseName : `${baseName}_${count + 1}`;
  });

  const dataRowsRaw = rawMatrix.slice(1);
  if (dataRowsRaw.length === 0) {
    throw new Error('The Excel file contains headers but 0 data rows.');
  }

  const rows: DataRow[] = dataRowsRaw.map((rawRow) => {
    const rowObj: DataRow = {};
    columns.forEach((col, colIdx) => {
      const val = rawRow[colIdx];
      rowObj[col] = val !== undefined && val !== null ? String(val) : '';
    });
    return rowObj;
  });

  return { columns, rows, fileType: 'XLSX' };
}

/**
 * Comprehensive Data Quality Analysis on actual dataset
 * Detects all 8 required issue categories without modifying original data.
 */
export function analyzeDataset(columns: string[], rows: DataRow[]): DataQualityReport {
  const totalRows = rows.length;
  const totalColumns = columns.length;
  const totalCells = totalRows * totalColumns;

  // 1. Empty rows detection
  const emptyRowIndices: number[] = [];
  const emptyRowSamples: AffectedCell[] = [];

  rows.forEach((row, rIdx) => {
    const allBlank = columns.every((col) => isBlank(row[col]));
    if (allBlank) {
      emptyRowIndices.push(rIdx);
      if (emptyRowSamples.length < 25) {
        emptyRowSamples.push({
          rowIndex: rIdx,
          column: 'All Columns',
          value: '(Empty Row)',
          detail: `Row ${rIdx + 1} contains no values in any column`,
        });
      }
    }
  });
  const emptyRowSet = new Set(emptyRowIndices);

  // 2. Duplicate rows detection (among non-empty rows, exact match across all columns)
  const seenRowSignatures = new Map<string, number>();
  const duplicateRowIndices: number[] = [];
  const duplicateRowSamples: AffectedCell[] = [];

  rows.forEach((row, rIdx) => {
    if (emptyRowSet.has(rIdx)) return;
    const signature = columns.map((col) => row[col] ?? '').join('\u0001');
    const firstSeenIdx = seenRowSignatures.get(signature);
    if (firstSeenIdx !== undefined) {
      duplicateRowIndices.push(rIdx);
      if (duplicateRowSamples.length < 30) {
        const previewText = columns
          .slice(0, 3)
          .map((c) => `${c}: "${row[c] ?? ''}"`)
          .join(', ');
        duplicateRowSamples.push({
          rowIndex: rIdx,
          column: columns[0] || 'Row',
          value: previewText,
          detail: `Exact duplicate of Row ${firstSeenIdx + 1}`,
        });
      }
    } else {
      seenRowSignatures.set(signature, rIdx);
    }
  });

  // 3. Empty columns detection
  const emptyColumns: string[] = [];
  const emptyColumnSamples: AffectedCell[] = [];

  columns.forEach((col) => {
    const isColEmpty = rows.every((row) => isBlank(row[col]));
    if (isColEmpty) {
      emptyColumns.push(col);
      emptyColumnSamples.push({
        rowIndex: 0,
        column: col,
        value: '(All Blank)',
        detail: `Column "${col}" has 0 non-empty values across all ${totalRows} rows`,
      });
    }
  });
  const emptyColumnSet = new Set(emptyColumns);

  // 4. Missing or blank values (in non-empty rows and non-empty columns, plus if a column is empty we also note missingness)
  let missingValuesCount = 0;
  const missingRowSet = new Set<number>();
  const missingColSet = new Set<string>();
  const missingSamples: AffectedCell[] = [];

  // 5. Extra whitespace
  let extraWhitespaceCount = 0;
  const whitespaceRowSet = new Set<number>();
  const whitespaceColSet = new Set<string>();
  const whitespaceSamples: AffectedCell[] = [];

  rows.forEach((row, rIdx) => {
    if (emptyRowSet.has(rIdx)) return; // empty rows counted separately
    columns.forEach((col) => {
      if (emptyColumnSet.has(col)) return; // empty columns counted separately
      const rawVal = row[col] ?? '';
      if (isBlank(rawVal)) {
        missingValuesCount++;
        missingRowSet.add(rIdx);
        missingColSet.add(col);
        if (missingSamples.length < 40) {
          missingSamples.push({
            rowIndex: rIdx,
            column: col,
            value: rawVal === '' ? '(Blank)' : '(Whitespace Only)',
            detail: `Missing value at Row ${rIdx + 1}, Column "${col}"`,
          });
        }
      } else if (hasExtraWhitespace(rawVal)) {
        extraWhitespaceCount++;
        whitespaceRowSet.add(rIdx);
        whitespaceColSet.add(col);
        if (whitespaceSamples.length < 40) {
          whitespaceSamples.push({
            rowIndex: rIdx,
            column: col,
            value: JSON.stringify(rawVal),
            detail: `Should be "${normalizeWhitespace(rawVal)}"`,
          });
        }
      }
    });
  });

  // 6. Inconsistent column names
  const inconsistentCols: string[] = [];
  const inconsistentColSamples: AffectedCell[] = [];
  columns.forEach((col, idx) => {
    if (isColumnNameInconsistent(col, columns)) {
      inconsistentCols.push(col);
      inconsistentColSamples.push({
        rowIndex: 0,
        column: col,
        value: `"${col}"`,
        detail: `Suggested standardized name: "${toStandardColumnName(col, idx)}"`,
      });
    }
  });

  // 7 & 8. Per-column profiling: Numeric columns with invalid values & Potentially inconsistent data formats
  let invalidNumericValuesCount = 0;
  const invalidNumericRowSet = new Set<number>();
  const invalidNumericColSet = new Set<string>();
  const invalidNumericSamples: AffectedCell[] = [];

  let inconsistentFormatsCount = 0;
  const formatRowSet = new Set<number>();
  const formatColSet = new Set<string>();
  const formatSamples: AffectedCell[] = [];

  const columnProfiles: ColumnProfile[] = columns.map((col, colIdx) => {
    const nonEmptyEntries: { rowIndex: number; val: string; trimmed: string }[] = [];
    let colMissing = 0;
    let colWhitespace = 0;

    rows.forEach((row, rIdx) => {
      if (emptyRowSet.has(rIdx)) return;
      const v = row[col] ?? '';
      if (isBlank(v)) {
        colMissing++;
      } else {
        if (hasExtraWhitespace(v)) colWhitespace++;
        nonEmptyEntries.push({ rowIndex: rIdx, val: v, trimmed: normalizeWhitespace(v) });
      }
    });

    const uniqueValues = new Set(nonEmptyEntries.map((e) => e.trimmed));

    if (nonEmptyEntries.length === 0) {
      return {
        name: col,
        inferredType: 'empty',
        nonEmptyCount: 0,
        missingCount: colMissing,
        uniqueCount: 0,
        whitespaceCount: 0,
        invalidNumericCount: 0,
        isNameInconsistent: inconsistentCols.includes(col),
        suggestedStandardName: toStandardColumnName(col, colIdx),
      };
    }

    // Check numeric ratio
    const strictNumericEntries = nonEmptyEntries.filter((e) => isStrictNumber(e.trimmed));
    const formattedNumericEntries = nonEmptyEntries.filter((e) => isFormattedNumberLike(e.trimmed));
    const numericRatio = formattedNumericEntries.length / nonEmptyEntries.length;

    // Check date ratio
    const datePatterns = new Map<string, { count: number; entries: typeof nonEmptyEntries }>();
    nonEmptyEntries.forEach((e) => {
      const pat = detectDatePattern(e.trimmed);
      if (pat) {
        const cur = datePatterns.get(pat) || { count: 0, entries: [] };
        cur.count++;
        cur.entries.push(e);
        datePatterns.set(pat, cur);
      }
    });
    const totalDateMatches = Array.from(datePatterns.values()).reduce((acc, v) => acc + v.count, 0);
    const dateRatio = totalDateMatches / nonEmptyEntries.length;

    let inferredType: ColumnProfile['inferredType'] = 'text';
    let colInvalidNumericCount = 0;
    let formatDetail: string | undefined;

    // Determine if this is a numeric column (>= 50% numeric-like and at least 2 numeric values)
    if (numericRatio >= 0.5 && formattedNumericEntries.length >= 2) {
      inferredType = 'numeric';

      // Any entry that is NOT a strict clean number:
      // 1) Completely non-numeric strings (e.g., "TBD", "N/A", "error", "pending") -> Invalid numeric value
      // 2) Formatted currency/commas mixed with plain numbers -> also flagged under invalid numeric or format inconsistency
      nonEmptyEntries.forEach((e) => {
        if (!isFormattedNumberLike(e.trimmed)) {
          colInvalidNumericCount++;
          invalidNumericValuesCount++;
          invalidNumericRowSet.add(e.rowIndex);
          invalidNumericColSet.add(col);
          if (invalidNumericSamples.length < 40) {
            invalidNumericSamples.push({
              rowIndex: e.rowIndex,
              column: col,
              value: e.trimmed,
              detail: `Non-numeric value "${e.trimmed}" in numeric column "${col}"`,
            });
          }
        } else if (!isStrictNumber(e.trimmed)) {
          // Has currency symbol or commas like "$1,200.00" while column is numeric
          colInvalidNumericCount++;
          invalidNumericValuesCount++;
          invalidNumericRowSet.add(e.rowIndex);
          invalidNumericColSet.add(col);
          if (invalidNumericSamples.length < 40) {
            invalidNumericSamples.push({
              rowIndex: e.rowIndex,
              column: col,
              value: e.trimmed,
              detail: `Unstandardized numeric string "${e.trimmed}" (contains symbols/commas) in numeric column "${col}"`,
            });
          }
        }
      });
    } else if (dateRatio >= 0.5 && totalDateMatches >= 2) {
      inferredType = 'date';
      // Check if multiple date formats exist or non-date strings exist in date column
      if (datePatterns.size > 1) {
        const patternsList = Array.from(datePatterns.entries()).sort((a, b) => b[1].count - a[1].count);
        const dominantPattern = patternsList[0][0];
        formatDetail = `Mixed date formats (${patternsList.map((p) => p[0]).join(' vs ')})`;
        patternsList.slice(1).forEach(([, group]) => {
          group.entries.forEach((e) => {
            inconsistentFormatsCount++;
            formatRowSet.add(e.rowIndex);
            formatColSet.add(col);
            if (formatSamples.length < 40) {
              formatSamples.push({
                rowIndex: e.rowIndex,
                column: col,
                value: e.trimmed,
                detail: `Uses format different from dominant "${dominantPattern}"`,
              });
            }
          });
        });
      }
      // Also flag entries in a date column that don't match any date pattern
      nonEmptyEntries.forEach((e) => {
        if (!detectDatePattern(e.trimmed)) {
          inconsistentFormatsCount++;
          formatRowSet.add(e.rowIndex);
          formatColSet.add(col);
          if (formatSamples.length < 40) {
            formatSamples.push({
              rowIndex: e.rowIndex,
              column: col,
              value: e.trimmed,
              detail: `Unrecognized date format in date column "${col}"`,
            });
          }
        }
      });
    } else {
      // Check boolean or text casing inconsistencies
      const lowerMap = new Map<string, Map<string, { count: number; entries: typeof nonEmptyEntries }>>();
      nonEmptyEntries.forEach((e) => {
        const lower = e.trimmed.toLowerCase();
        if (!lowerMap.has(lower)) {
          lowerMap.set(lower, new Map());
        }
        const variants = lowerMap.get(lower)!;
        const vEntry = variants.get(e.trimmed) || { count: 0, entries: [] };
        vEntry.count++;
        vEntry.entries.push(e);
        variants.set(e.trimmed, vEntry);
      });

      lowerMap.forEach((variants) => {
        if (variants.size > 1) {
          const sortedVariants = Array.from(variants.entries()).sort((a, b) => b[1].count - a[1].count);
          const allForms = sortedVariants.map(([k]) => `"${k}"`).join(' vs ');
          formatDetail = `Inconsistent text casing (${allForms})`;
          // Flag the minority casing variants (or if tied, all but the first)
          sortedVariants.slice(1).forEach(([, group]) => {
            group.entries.forEach((e) => {
              inconsistentFormatsCount++;
              formatRowSet.add(e.rowIndex);
              formatColSet.add(col);
              if (formatSamples.length < 40) {
                formatSamples.push({
                  rowIndex: e.rowIndex,
                  column: col,
                  value: e.trimmed,
                  detail: `Inconsistent casing: ${allForms}`,
                });
              }
            });
          });
        }
      });
    }

    return {
      name: col,
      inferredType,
      nonEmptyCount: nonEmptyEntries.length,
      missingCount: colMissing,
      uniqueCount: uniqueValues.size,
      whitespaceCount: colWhitespace,
      invalidNumericCount: colInvalidNumericCount,
      formatInconsistencyDetail: formatDetail,
      isNameInconsistent: inconsistentCols.includes(col),
      suggestedStandardName: toStandardColumnName(col, colIdx),
    };
  });

  // Compute overall Data Quality Score (0 to 100)
  const totalIssueInstances =
    duplicateRowIndices.length * totalColumns +
    emptyRowIndices.length * totalColumns +
    emptyColumns.length * totalRows +
    missingValuesCount +
    extraWhitespaceCount +
    inconsistentCols.length * 2 +
    inconsistentFormatsCount +
    invalidNumericValuesCount;

  const denominator = Math.max(1, totalCells + totalColumns * 2);
  const rawScore = Math.max(0, 100 - (totalIssueInstances / denominator) * 100);
  const qualityScore = totalIssueInstances === 0 ? 100 : Math.min(99, Math.round(rawScore));

  // First missing column for helpful suggested instruction
  const firstMissingCol = Array.from(missingColSet)[0] || columns[0] || 'City';
  const firstNumericCol = Array.from(invalidNumericColSet)[0] || 'Amount';
  const firstFormatCol = Array.from(formatColSet)[0] || 'City';

  const issues: Record<IssueType, IssueCategoryReport> = {
    duplicate_rows: {
      type: 'duplicate_rows',
      title: 'Duplicate Rows',
      description: 'Exact duplicate records across all columns.',
      count: duplicateRowIndices.length,
      severity: duplicateRowIndices.length > 0 ? 'high' : 'low',
      affectedRowIndices: duplicateRowIndices,
      affectedColumns: columns,
      sampleCells: duplicateRowSamples,
      suggestedInstruction: 'Remove duplicate rows',
    },
    missing_values: {
      type: 'missing_values',
      title: 'Missing or Blank Values',
      description: 'Empty or blank cells inside active rows and columns.',
      count: missingValuesCount,
      severity: missingValuesCount > 0 ? 'high' : 'low',
      affectedRowIndices: Array.from(missingRowSet).sort((a, b) => a - b),
      affectedColumns: Array.from(missingColSet),
      sampleCells: missingSamples,
      suggestedInstruction: `Replace missing ${firstMissingCol.trim()} values with Unknown`,
    },
    empty_rows: {
      type: 'empty_rows',
      title: 'Empty Rows',
      description: 'Rows where every single column cell is empty or blank.',
      count: emptyRowIndices.length,
      severity: emptyRowIndices.length > 0 ? 'medium' : 'low',
      affectedRowIndices: emptyRowIndices,
      affectedColumns: columns,
      sampleCells: emptyRowSamples,
      suggestedInstruction: 'Remove empty rows',
    },
    empty_columns: {
      type: 'empty_columns',
      title: 'Empty Columns',
      description: 'Columns containing zero values across the entire dataset.',
      count: emptyColumns.length,
      severity: emptyColumns.length > 0 ? 'medium' : 'low',
      affectedRowIndices: [],
      affectedColumns: emptyColumns,
      sampleCells: emptyColumnSamples,
      suggestedInstruction: 'Remove empty columns',
    },
    extra_whitespace: {
      type: 'extra_whitespace',
      title: 'Extra Whitespace',
      description: 'Cells with leading spaces, trailing spaces, or double internal spaces.',
      count: extraWhitespaceCount,
      severity: extraWhitespaceCount > 0 ? 'medium' : 'low',
      affectedRowIndices: Array.from(whitespaceRowSet).sort((a, b) => a - b),
      affectedColumns: Array.from(whitespaceColSet),
      sampleCells: whitespaceSamples,
      suggestedInstruction: 'Trim extra spaces',
    },
    inconsistent_column_names: {
      type: 'inconsistent_column_names',
      title: 'Inconsistent Column Names',
      description: 'Headers with spaces, special symbols, or mixed casing conventions.',
      count: inconsistentCols.length,
      severity: inconsistentCols.length > 0 ? 'low' : 'low',
      affectedRowIndices: [],
      affectedColumns: inconsistentCols,
      sampleCells: inconsistentColSamples,
      suggestedInstruction: 'Standardize column names',
    },
    inconsistent_formats: {
      type: 'inconsistent_formats',
      title: 'Potentially Inconsistent Formats',
      description: 'Mixed date patterns (e.g. YYYY-MM-DD vs MM/DD/YYYY) or inconsistent text casing.',
      count: inconsistentFormatsCount,
      severity: inconsistentFormatsCount > 0 ? 'medium' : 'low',
      affectedRowIndices: Array.from(formatRowSet).sort((a, b) => a - b),
      affectedColumns: Array.from(formatColSet),
      sampleCells: formatSamples,
      suggestedInstruction: `Convert ${firstFormatCol.trim()} to titlecase`,
    },
    invalid_numeric_values: {
      type: 'invalid_numeric_values',
      title: 'Invalid Values in Numeric Columns',
      description: 'Non-numeric text or unformatted currency symbols inside numeric columns.',
      count: invalidNumericValuesCount,
      severity: invalidNumericValuesCount > 0 ? 'high' : 'low',
      affectedRowIndices: Array.from(invalidNumericRowSet).sort((a, b) => a - b),
      affectedColumns: Array.from(invalidNumericColSet),
      sampleCells: invalidNumericSamples,
      suggestedInstruction: `Convert ${firstNumericCol.trim()} to number`,
    },
  };

  return {
    totalRows,
    totalColumns,
    totalCells,
    qualityScore,
    duplicateRowsCount: duplicateRowIndices.length,
    missingValuesCount,
    emptyRowsCount: emptyRowIndices.length,
    emptyColumnsCount: emptyColumns.length,
    extraWhitespaceCount,
    inconsistentColumnNamesCount: inconsistentCols.length,
    inconsistentFormatsCount,
    invalidNumericValuesCount,
    issues,
    columnProfiles,
  };
}

/**
 * Resolve a user-referenced column name against actual dataset columns (case-insensitive & trimmed/standardized match)
 */
function findMatchingColumn(userColRaw: string, availableColumns: string[]): string | null {
  const cleanedUser = userColRaw.trim().replace(/^["']|["']$/g, '');
  if (!cleanedUser) return null;

  // 1. Exact match
  const exact = availableColumns.find((c) => c === cleanedUser);
  if (exact) return exact;

  // 2. Case-insensitive & trimmed match
  const lower = cleanedUser.toLowerCase();
  const ciMatch = availableColumns.find((c) => c.trim().toLowerCase() === lower);
  if (ciMatch) return ciMatch;

  // 3. Standardized snake_case match
  const stdUser = toStandardColumnName(cleanedUser, 0);
  const stdMatch = availableColumns.find((c, i) => toStandardColumnName(c, i) === stdUser);
  if (stdMatch) return stdMatch;

  return null;
}

/**
 * Rule-based instruction parser
 * Safely parses user natural-language cleaning instructions into deterministic operations.
 * Never executes arbitrary code or invents replacement values.
 */
export function parseCleaningInstructions(
  rawInput: string,
  availableColumns: string[]
): ParsedInstructionResult {
  const trimmedInput = rawInput.trim();
  if (!trimmedInput) {
    return { rawInput, recognized: [], unsupported: [] };
  }

  // Split input into individual instruction clauses safely:
  // Split by newlines, semicolons, periods followed by space/end, or commas/and before action verbs
  const normalizedClauses = trimmedInput
    .split(/(?:\r?\n|;|\.(?=\s|$)|,\s*(?:and\s+)?(?=(?:remove|delete|drop|trim|strip|convert|change|make|set|standardize|normalize|clean|replace|fill|lowercase|uppercase|deduplicate)\b)|\s+and\s+(?=(?:remove|delete|drop|trim|strip|convert|change|make|set|standardize|normalize|clean|replace|fill|lowercase|uppercase|deduplicate)\b))/i)
    .map((s) => s.trim().replace(/^[-,•*]\s*/, '').replace(/\.$/, '').trim())
    .filter((s) => s.length > 0);

  const recognized: RecognizedOperation[] = [];
  const unsupported: UnsupportedInstruction[] = [];

  normalizedClauses.forEach((clause, idx) => {
    const lower = clause.toLowerCase();
    const opId = `op_${idx + 1}_${Date.now()}`;

    // 1a. Remove duplicates based on selected columns
    const dupByColMatch = clause.match(
      /\b(?:remove|delete|drop|deduplicate)\b.*\bduplicate(?:s|\s+rows|\s+records)?\s+(?:based\s+on|by|in|for|on)\s+(?:columns?\s+)?(.+)$/i
    );
    if (dupByColMatch) {
      const rawColList = dupByColMatch[1]
        .split(/,|and/i)
        .map((s) => s.trim())
        .filter(Boolean);
      const matchedCols: string[] = [];
      const missingCols: string[] = [];
      rawColList.forEach((rc) => {
        const m = findMatchingColumn(rc, availableColumns);
        if (m) matchedCols.push(m);
        else missingCols.push(rc);
      });
      if (missingCols.length > 0 || matchedCols.length === 0) {
        unsupported.push({
          rawText: clause,
          reason: `Could not find column(s): ${missingCols.join(', ')} in dataset (${availableColumns.join(', ')}).`,
          suggestion: 'Specify valid column names from your dataset for duplicate detection.',
        });
        return;
      }
      recognized.push({
        id: opId,
        type: 'REMOVE_DUPLICATES_BY_COLUMNS',
        rawText: clause,
        title: `Remove Duplicates Based on Column(s): ${matchedCols.join(', ')}`,
        description: `Removes duplicate rows matching across [${matchedCols.join(', ')}], keeping the first occurrence.`,
        targetColumns: matchedCols,
        isDestructive: false,
      });
      return;
    }

    // 1b. Remove exact duplicate rows
    if (
      /\b(remove|delete|drop|deduplicate|eliminate)\b.*\b(exact\s+|all\s+)?duplicate(s|\s+rows|\s+records)?\b/i.test(clause) ||
      /^deduplicate(\s+rows|\s+dataset)?$/i.test(clause)
    ) {
      recognized.push({
        id: opId,
        type: 'REMOVE_DUPLICATES',
        rawText: clause,
        title: 'Remove Exact Duplicate Rows',
        description: 'Deletes rows that are 100% identical across all columns, keeping the first occurrence.',
        isDestructive: false,
      });
      return;
    }

    // 2. Trim leading and trailing whitespace
    if (
      /\b(trim|strip|remove|clean)\b.*\b(extra\s+|leading\s+|trailing\s+| leading\s+and\s+trailing\s+)?(whitespace|spaces|space)\b/i.test(
        clause
      ) ||
      /^trim\s+whitespace$/i.test(clause)
    ) {
      recognized.push({
        id: opId,
        type: 'TRIM_WHITESPACE',
        rawText: clause,
        title: 'Trim Extra Whitespace',
        description: 'Strips leading and trailing whitespace and collapses multiple internal spaces in all cells.',
        isDestructive: false,
      });
      return;
    }

    // 3. Convert column names to lowercase
    if (
      /\b(convert|change|make|set|transform)\b.*\b(column\s+names|columns|headers)\b.*\b(to\s+)?(lowercase|lower\s+case)\b/i.test(
        clause
      ) ||
      /^lowercase\s+(column\s+names|columns|headers)$/i.test(clause)
    ) {
      recognized.push({
        id: opId,
        type: 'LOWERCASE_COLUMNS',
        rawText: clause,
        title: 'Convert Column Names to Lowercase',
        description: 'Transforms all column headers to trimmed lowercase text.',
        isDestructive: false,
      });
      return;
    }

    // 4. Convert column names to uppercase
    if (
      /\b(convert|change|make|set|transform)\b.*\b(column\s+names|columns|headers)\b.*\b(to\s+)?(uppercase|upper\s+case|all\s+caps)\b/i.test(
        clause
      ) ||
      /^uppercase\s+(column\s+names|columns|headers)$/i.test(clause)
    ) {
      recognized.push({
        id: opId,
        type: 'UPPERCASE_COLUMNS',
        rawText: clause,
        title: 'Convert Column Names to Uppercase',
        description: 'Transforms all column headers to trimmed UPPERCASE text.',
        isDestructive: false,
      });
      return;
    }

    // 5. Standardize column names
    if (
      /\b(standardize|normalize|clean|snake_case|format)\b.*\b(column\s+names|columns|headers)\b/i.test(clause) ||
      /\b(convert|change|make)\b.*\b(column\s+names|columns|headers)\b.*\b(to\s+)?(snake_case|standard|standardized)\b/i.test(
        clause
      )
    ) {
      recognized.push({
        id: opId,
        type: 'STANDARDIZE_COLUMNS',
        rawText: clause,
        title: 'Standardize Column Names',
        description: 'Normalizes all column headers to clean snake_case identifiers without spaces or special symbols.',
        isDestructive: false,
      });
      return;
    }

    // 6. Remove empty rows
    if (/\b(remove|delete|drop)\b.*\b(all\s+)?(empty|blank)\s+rows\b/i.test(clause)) {
      recognized.push({
        id: opId,
        type: 'REMOVE_EMPTY_ROWS',
        rawText: clause,
        title: 'Remove Empty Rows',
        description: 'Removes rows where every column cell is completely blank.',
        isDestructive: false,
      });
      return;
    }

    // 7. Remove empty columns
    if (/\b(remove|delete|drop)\b.*\b(all\s+)?(empty|blank)\s+columns\b/i.test(clause)) {
      recognized.push({
        id: opId,
        type: 'REMOVE_EMPTY_COLUMNS',
        rawText: clause,
        title: 'Remove Empty Columns',
        description: 'Removes columns that contain zero non-empty values across the entire dataset.',
        isDestructive: true,
      });
      return;
    }

    // 8. Remove rows containing missing values (either globally or in a specific column)
    // e.g. "remove rows containing missing values", "remove rows with missing values", "remove rows with missing Email"
    const removeMissingColMatch = clause.match(
      /\b(?:remove|delete|drop)\s+rows\s+(?:containing|with|having|where)\s+(?:missing|blank|null|empty)\s+(?:values?\s+in\s+)?([a-zA-Z0-9_$\s()-]+?)(?:\s+values?|\s+column)?$/i
    );
    if (
      /\b(remove|delete|drop)\s+rows\s+(containing|with|having)\s+(any\s+)?(missing|blank|null|empty)\s+(values|cells|data)\b/i.test(
        clause
      ) ||
      /\b(remove|delete|drop)\s+(missing|incomplete)\s+rows\b/i.test(clause)
    ) {
      recognized.push({
        id: opId,
        type: 'REMOVE_MISSING_ROWS',
        rawText: clause,
        title: 'Remove Rows Containing Missing Values',
        description: 'Deletes any row that has one or more missing/blank cells in active columns.',
        isDestructive: true,
      });
      return;
    } else if (removeMissingColMatch) {
      const colCandidate = removeMissingColMatch[1].trim();
      if (!/^(values?|cells?|data)$/i.test(colCandidate)) {
        const matchedCol = findMatchingColumn(colCandidate, availableColumns);
        if (matchedCol) {
          recognized.push({
            id: opId,
            type: 'REMOVE_MISSING_ROWS',
            rawText: clause,
            title: `Remove Rows with Missing "${matchedCol}"`,
            description: `Deletes rows where column "${matchedCol}" is blank or empty.`,
            targetColumn: matchedCol,
            isDestructive: true,
          });
          return;
        } else {
          unsupported.push({
            rawText: clause,
            reason: `Column "${colCandidate}" was not found in the dataset (Available columns: ${availableColumns.join(', ')}).`,
            suggestion: `Use an existing column name or write "Remove rows containing missing values".`,
          });
          return;
        }
      }
    }

    // 9. Replace missing values in a specified column with a user-provided value
    // Patterns supported:
    // - "replace missing City values with Unknown"
    // - "replace missing values in City with Unknown"
    // - "fill missing City with Unknown"
    // - "replace blank City with Unknown"
    // - "replace all missing values with Unknown"
    const replacePatternA = clause.match(
      /\b(?:replace|fill|set|impute)\s+(?:all\s+)?(?:missing|blank|empty|null)\s+(.+?)\s+(?:values?\s+|cells?\s+)?(?:with|to|as)\s+(.+)$/i
    );
    const replacePatternB = clause.match(
      /\b(?:replace|fill|set|impute)\s+(?:all\s+)?(?:missing|blank|empty|null)\s+(?:values?|cells?)\s+in\s+(?:column\s+)?(.+?)\s+(?:with|to|as)\s+(.+)$/i
    );
    const replacePatternGlobal = clause.match(
      /\b(?:replace|fill|set)\s+(?:all\s+)?(?:missing|blank|empty|null)\s+(?:values?|cells?)\s+(?:with|to|as)\s+(.+)$/i
    );

    if (replacePatternB) {
      const rawCol = replacePatternB[1].trim();
      const rawVal = replacePatternB[2].trim().replace(/^["']|["']$/g, '');
      const matchedCol = findMatchingColumn(rawCol, availableColumns);
      if (!rawVal) {
        unsupported.push({
          rawText: clause,
          reason: 'No replacement value was provided. DataTrustAI never invents replacement values.',
          suggestion: `Specify an explicit value, e.g., "Replace missing ${rawCol} values with Unknown".`,
        });
        return;
      }
      if (!matchedCol) {
        unsupported.push({
          rawText: clause,
          reason: `Column "${rawCol}" does not exist in the current dataset (${availableColumns.join(', ')}).`,
          suggestion: `Specify a valid column name from your dataset.`,
        });
        return;
      }
      recognized.push({
        id: opId,
        type: 'REPLACE_MISSING_VALUES',
        rawText: clause,
        title: `Replace Missing "${matchedCol}" Values with "${rawVal}"`,
        description: `Fills all blank or empty cells in column "${matchedCol}" with "${rawVal}".`,
        targetColumn: matchedCol,
        replacementValue: rawVal,
        isDestructive: false,
      });
      return;
    }

    if (replacePatternGlobal) {
      const rawVal = replacePatternGlobal[1].trim().replace(/^["']|["']$/g, '');
      if (!rawVal) {
        unsupported.push({
          rawText: clause,
          reason: 'No replacement value was specified.',
          suggestion: 'Specify a replacement value, e.g., "Replace missing City values with Unknown".',
        });
        return;
      }
      recognized.push({
        id: opId,
        type: 'REPLACE_MISSING_VALUES',
        rawText: clause,
        title: `Replace All Missing Values with "${rawVal}"`,
        description: `Fills blank or empty cells across all non-empty columns with "${rawVal}".`,
        replacementValue: rawVal,
        isDestructive: false,
      });
      return;
    }

    if (replacePatternA) {
      const rawCol = replacePatternA[1].replace(/\b(column|values?|cells?)\b/gi, '').trim();
      const rawVal = replacePatternA[2].trim().replace(/^["']|["']$/g, '');
      if (!rawVal) {
        unsupported.push({
          rawText: clause,
          reason: 'No replacement value was specified. DataTrustAI does not guess or invent replacement values.',
          suggestion: 'Provide an explicit replacement value after "with".',
        });
        return;
      }
      if (!rawCol) {
        recognized.push({
          id: opId,
          type: 'REPLACE_MISSING_VALUES',
          rawText: clause,
          title: `Replace All Missing Values with "${rawVal}"`,
          description: `Fills blank or empty cells across all non-empty columns with "${rawVal}".`,
          replacementValue: rawVal,
          isDestructive: false,
        });
        return;
      }
      const matchedCol = findMatchingColumn(rawCol, availableColumns);
      if (!matchedCol) {
        unsupported.push({
          rawText: clause,
          reason: `Column "${rawCol}" was not found in the uploaded dataset. Available columns: ${availableColumns.join(', ')}.`,
          suggestion: `Check the column spelling or choose one of the existing columns.`,
        });
        return;
      }
      recognized.push({
        id: opId,
        type: 'REPLACE_MISSING_VALUES',
        rawText: clause,
        title: `Replace Missing "${matchedCol}" Values with "${rawVal}"`,
        description: `Fills all blank or empty cells in column "${matchedCol}" with "${rawVal}".`,
        targetColumn: matchedCol,
        replacementValue: rawVal,
        isDestructive: false,
      });
      return;
    }

    // Check if user wrote "replace missing X values" WITHOUT "with Y"
    if (/\b(replace|fill|impute)\b.*\b(missing|blank|null)\b/i.test(clause)) {
      unsupported.push({
        rawText: clause,
        reason: 'Missing replacement value or ambiguous column target. DataTrustAI never invents replacement values.',
        suggestion: 'Use the format: "Replace missing <Column> values with <Value>" (e.g., "Replace missing City values with Unknown").',
      });
      return;
    }

    // 10. Convert a selected column to a supported data type
    // e.g. "convert Price to number", "convert column Age to integer", "convert Join_Date to date", "convert City to titlecase"
    const convertColMatch = clause.match(
      /\b(?:convert|change|cast|format|transform)\s+(?:column\s+)?(.+?)\s+(?:to|as|into)\s+(number|numeric|integer|int|float|decimal|date|iso\s*date|boolean|bool|uppercase|upper\s*case|lowercase|lower\s*case|titlecase|title\s*case|text|string)\b/i
    );
    if (convertColMatch) {
      const rawCol = convertColMatch[1].replace(/\b(column|values?|format|type)\b/gi, '').trim();
      const rawType = convertColMatch[2].toLowerCase().replace(/\s+/g, '');

      const matchedCol = findMatchingColumn(rawCol, availableColumns);
      if (!matchedCol) {
        unsupported.push({
          rawText: clause,
          reason: `Column "${rawCol}" was not found in the dataset (Available: ${availableColumns.join(', ')}).`,
          suggestion: 'Use an exact column name from your dataset, e.g., "Convert <Column> to number".',
        });
        return;
      }

      const typeMap: Record<string, SupportedTargetType> = {
        number: 'number',
        numeric: 'number',
        integer: 'integer',
        int: 'integer',
        float: 'float',
        decimal: 'float',
        date: 'date',
        isodate: 'date',
        boolean: 'boolean',
        bool: 'boolean',
        uppercase: 'uppercase',
        lowercase: 'lowercase',
        titlecase: 'titlecase',
        text: 'text',
        string: 'text',
      };

      const targetDataType = typeMap[rawType] || 'text';
      const isDestructiveType =
        targetDataType === 'number' ||
        targetDataType === 'integer' ||
        targetDataType === 'float' ||
        targetDataType === 'date';

      recognized.push({
        id: opId,
        type: 'CONVERT_COLUMN_TYPE',
        rawText: clause,
        title: `Convert "${matchedCol}" to ${targetDataType.toUpperCase()}`,
        description: `Converts values in column "${matchedCol}" to standardized ${targetDataType} format.`,
        targetColumn: matchedCol,
        targetDataType,
        isDestructive: isDestructiveType,
      });
      return;
    }

    // If none of the deterministic rules matched, explain clearly why it's unsupported
    let reason =
      'This instruction does not match a supported deterministic cleaning rule.';
    if (/\b(predict|forecast|ai|gpt|llm|summarize|sentiment|translate|generate|enrich)\b/i.test(lower)) {
      reason =
        'Generative AI inference, prediction, or external enrichment is not enabled. DataTrustAI runs 100% locally using deterministic rule-based transformations without paid AI APIs.';
    } else if (/\b(sort|group|pivot|merge|join|split)\b/i.test(lower)) {
      reason =
        'Structural table reshaping (pivoting, joining, or sorting) is outside the supported data-cleaning rule set.';
    }

    unsupported.push({
      rawText: clause,
      reason,
      suggestion:
        'Choose from supported operations: Remove duplicate rows, Trim extra spaces, Convert column names to lowercase/uppercase, Standardize column names, Remove empty rows/columns, Replace missing <Column> values with <Value>, Remove rows containing missing values, or Convert <Column> to <number|integer|date|boolean|titlecase|uppercase|lowercase>.',
    });
  });

  return {
    rawInput,
    recognized,
    unsupported,
  };
}

/**
 * Helper to convert a cell value to a target data type deterministically
 */
function convertValueToType(rawVal: string, targetType: SupportedTargetType): { value: string; changed: boolean; coercedInvalid: boolean } {
  if (isBlank(rawVal)) {
    return { value: rawVal, changed: false, coercedInvalid: false };
  }
  const trimmed = rawVal.trim();

  switch (targetType) {
    case 'number':
    case 'float': {
      const stripped = trimmed.replace(/^[$€£¥₹\s]+|[,%\s]+$/g, '').replace(/,/g, '');
      const num = Number(stripped);
      if (!Number.isNaN(num) && stripped !== '') {
        const formatted = String(num);
        return { value: formatted, changed: formatted !== rawVal, coercedInvalid: false };
      }
      // Cannot parse as valid number -> clear to empty string so column is strictly valid or mark coerced
      return { value: '', changed: rawVal !== '', coercedInvalid: true };
    }
    case 'integer': {
      const stripped = trimmed.replace(/^[$€£¥₹\s]+|[,%\s]+$/g, '').replace(/,/g, '');
      const num = Number(stripped);
      if (!Number.isNaN(num) && stripped !== '') {
        const formatted = String(Math.round(num));
        return { value: formatted, changed: formatted !== rawVal, coercedInvalid: false };
      }
      return { value: '', changed: rawVal !== '', coercedInvalid: true };
    }
    case 'date': {
      // Standardize to YYYY-MM-DD if parseable
      if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
        return { value: trimmed, changed: trimmed !== rawVal, coercedInvalid: false };
      }
      // Check MM/DD/YYYY or DD/MM/YYYY
      const slashMatch = trimmed.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
      if (slashMatch) {
        const p1 = parseInt(slashMatch[1], 10);
        const p2 = parseInt(slashMatch[2], 10);
        const year = slashMatch[3];
        // If p1 > 12, it's DD/MM/YYYY, else assume MM/DD/YYYY
        const month = p1 > 12 ? p2 : p1;
        const day = p1 > 12 ? p1 : p2;
        if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
          const iso = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
          return { value: iso, changed: iso !== rawVal, coercedInvalid: false };
        }
      }
      const parsedDate = new Date(trimmed);
      if (!Number.isNaN(parsedDate.getTime())) {
        const y = parsedDate.getFullYear();
        const m = String(parsedDate.getMonth() + 1).padStart(2, '0');
        const d = String(parsedDate.getDate()).padStart(2, '0');
        const iso = `${y}-${m}-${d}`;
        return { value: iso, changed: iso !== rawVal, coercedInvalid: false };
      }
      return { value: trimmed, changed: false, coercedInvalid: true };
    }
    case 'boolean': {
      const l = trimmed.toLowerCase();
      if (['true', 'yes', 'y', '1', 'active', 'enabled'].includes(l)) {
        return { value: 'true', changed: rawVal !== 'true', coercedInvalid: false };
      }
      if (['false', 'no', 'n', '0', 'inactive', 'disabled'].includes(l)) {
        return { value: 'false', changed: rawVal !== 'false', coercedInvalid: false };
      }
      return { value: trimmed, changed: false, coercedInvalid: true };
    }
    case 'uppercase': {
      const up = normalizeWhitespace(trimmed).toUpperCase();
      return { value: up, changed: up !== rawVal, coercedInvalid: false };
    }
    case 'lowercase': {
      const low = normalizeWhitespace(trimmed).toLowerCase();
      return { value: low, changed: low !== rawVal, coercedInvalid: false };
    }
    case 'titlecase': {
      const tc = normalizeWhitespace(trimmed)
        .toLowerCase()
        .replace(/\b\w/g, (c) => c.toUpperCase());
      return { value: tc, changed: tc !== rawVal, coercedInvalid: false };
    }
    case 'text':
    default: {
      const txt = normalizeWhitespace(trimmed);
      return { value: txt, changed: txt !== rawVal, coercedInvalid: false };
    }
  }
}

/**
 * Simulate proposed cleaning operations on a dataset and return a full Before/After diff preview
 * Does NOT mutate the original columns or rows arrays.
 */
export function simulateCleaningOperations(
  beforeColumns: string[],
  beforeRows: DataRow[],
  operations: RecognizedOperation[]
): CleaningPreviewResult {
  let activeCols: { originalName: string; currentName: string }[] = beforeColumns.map((c) => ({
    originalName: c,
    currentName: c,
  }));

  let activeRows: { originalRowIndex: number; data: DataRow }[] = beforeRows.map((r, idx) => ({
    originalRowIndex: idx,
    data: { ...r },
  }));

  const operationMetrics: OperationExecutionMetric[] = [];
  const cellDiffs: CellDiff[] = [];
  const removedRows: RemovedRowRecord[] = [];
  const affectedOriginalRowSet = new Set<number>();
  const destructiveWarnings: string[] = [];

  let duplicatesRemoved = 0;
  let emptyRowsRemoved = 0;
  let missingRowsRemoved = 0;
  let missingValuesReplaced = 0;
  let whitespaceTrimmedCount = 0;
  let typeConversionsCount = 0;

  const resolveColKey = (targetCol?: string): { originalName: string; currentName: string } | undefined => {
    if (!targetCol) return undefined;
    const lower = targetCol.trim().toLowerCase();
    return activeCols.find(
      (c) =>
        c.originalName === targetCol ||
        c.currentName === targetCol ||
        c.originalName.trim().toLowerCase() === lower ||
        c.currentName.trim().toLowerCase() === lower
    );
  };

  operations.forEach((op) => {
    let opAffectedRows = 0;
    let opAffectedCells = 0;

    switch (op.type) {
      case 'REMOVE_EMPTY_ROWS': {
        const kept: typeof activeRows = [];
        activeRows.forEach((r) => {
          const isRowEmpty = activeCols.every((c) => isBlank(r.data[c.originalName]));
          if (isRowEmpty) {
            opAffectedRows++;
            emptyRowsRemoved++;
            affectedOriginalRowSet.add(r.originalRowIndex);
            removedRows.push({
              originalRowIndex: r.originalRowIndex,
              row: { ...r.data },
              reason: 'Empty row removed',
            });
          } else {
            kept.push(r);
          }
        });
        activeRows = kept;
        break;
      }

      case 'REMOVE_DUPLICATES': {
        const seen = new Set<string>();
        const kept: typeof activeRows = [];
        activeRows.forEach((r) => {
          const isRowEmpty = activeCols.every((c) => isBlank(r.data[c.originalName]));
          if (isRowEmpty) {
            kept.push(r);
            return;
          }
          const sig = activeCols.map((c) => r.data[c.originalName] ?? '').join('\u0001');
          if (seen.has(sig)) {
            opAffectedRows++;
            duplicatesRemoved++;
            affectedOriginalRowSet.add(r.originalRowIndex);
            removedRows.push({
              originalRowIndex: r.originalRowIndex,
              row: { ...r.data },
              reason: 'Exact duplicate row removed',
            });
          } else {
            seen.add(sig);
            kept.push(r);
          }
        });
        activeRows = kept;
        break;
      }

      case 'REMOVE_DUPLICATES_BY_COLUMNS': {
        const seen = new Set<string>();
        const kept: typeof activeRows = [];
        const resolvedTargets = (op.targetColumns || [])
          .map((tc) => resolveColKey(tc))
          .filter((c): c is { originalName: string; currentName: string } => Boolean(c));
        const colsForKey = resolvedTargets.length > 0 ? resolvedTargets : activeCols;

        activeRows.forEach((r) => {
          const isRowEmpty = activeCols.every((c) => isBlank(r.data[c.originalName]));
          if (isRowEmpty) {
            kept.push(r);
            return;
          }
          const sig = colsForKey
            .map((c) => (r.data[c.originalName] ?? '').trim())
            .join('\u0001');
          if (seen.has(sig)) {
            opAffectedRows++;
            duplicatesRemoved++;
            affectedOriginalRowSet.add(r.originalRowIndex);
            removedRows.push({
              originalRowIndex: r.originalRowIndex,
              row: { ...r.data },
              reason: `Duplicate based on column(s): ${colsForKey.map((c) => c.currentName).join(', ')}`,
            });
          } else {
            seen.add(sig);
            kept.push(r);
          }
        });
        activeRows = kept;
        break;
      }

      case 'TRIM_WHITESPACE': {
        activeRows.forEach((r) => {
          let rowChanged = false;
          activeCols.forEach((c) => {
            const oldVal = r.data[c.originalName] ?? '';
            if (hasExtraWhitespace(oldVal)) {
              const newVal = normalizeWhitespace(oldVal);
              if (newVal !== oldVal) {
                r.data[c.originalName] = newVal;
                rowChanged = true;
                opAffectedCells++;
                whitespaceTrimmedCount++;
                cellDiffs.push({
                  rowIndex: r.originalRowIndex,
                  column: c.currentName,
                  beforeValue: oldVal,
                  afterValue: newVal,
                  operationTitle: op.title,
                });
              }
            }
          });
          if (rowChanged) {
            opAffectedRows++;
            affectedOriginalRowSet.add(r.originalRowIndex);
          }
        });
        break;
      }

      case 'REMOVE_EMPTY_COLUMNS': {
        const keptCols: typeof activeCols = [];
        const droppedNames: string[] = [];
        activeCols.forEach((c) => {
          const allEmpty = activeRows.every((r) => isBlank(r.data[c.originalName]));
          if (allEmpty) {
            droppedNames.push(c.currentName);
            opAffectedCells += activeRows.length;
          } else {
            keptCols.push(c);
          }
        });
        if (droppedNames.length > 0) {
          opAffectedRows = activeRows.length;
          destructiveWarnings.push(
            `Removing ${droppedNames.length} empty column(s): ${droppedNames.map((n) => `"${n}"`).join(', ')}.`
          );
        }
        activeCols = keptCols;
        break;
      }

      case 'LOWERCASE_COLUMNS': {
        const seenNames = new Map<string, number>();
        activeCols.forEach((c) => {
          const target = c.currentName.trim().toLowerCase();
          const count = seenNames.get(target) || 0;
          seenNames.set(target, count + 1);
          const finalName = count === 0 ? target : `${target}_${count + 1}`;
          if (finalName !== c.currentName) {
            c.currentName = finalName;
            opAffectedCells++;
          }
        });
        break;
      }

      case 'UPPERCASE_COLUMNS': {
        const seenNames = new Map<string, number>();
        activeCols.forEach((c) => {
          const target = c.currentName.trim().toUpperCase();
          const count = seenNames.get(target) || 0;
          seenNames.set(target, count + 1);
          const finalName = count === 0 ? target : `${target}_${count + 1}`;
          if (finalName !== c.currentName) {
            c.currentName = finalName;
            opAffectedCells++;
          }
        });
        break;
      }

      case 'STANDARDIZE_COLUMNS': {
        const seenNames = new Map<string, number>();
        activeCols.forEach((c, idx) => {
          const target = toStandardColumnName(c.currentName, idx);
          const count = seenNames.get(target) || 0;
          seenNames.set(target, count + 1);
          const finalName = count === 0 ? target : `${target}_${count + 1}`;
          if (finalName !== c.currentName) {
            c.currentName = finalName;
            opAffectedCells++;
          }
        });
        break;
      }

      case 'REPLACE_MISSING_VALUES': {
        const replacement = op.replacementValue ?? '';
        const targetColObj = resolveColKey(op.targetColumn);
        const colsToProcess = targetColObj ? [targetColObj] : activeCols;

        activeRows.forEach((r) => {
          const isRowCompletelyEmpty = activeCols.every((c) => isBlank(r.data[c.originalName]));
          if (isRowCompletelyEmpty) return;

          let rowChanged = false;
          colsToProcess.forEach((c) => {
            const oldVal = r.data[c.originalName] ?? '';
            if (isBlank(oldVal)) {
              r.data[c.originalName] = replacement;
              rowChanged = true;
              opAffectedCells++;
              missingValuesReplaced++;
              cellDiffs.push({
                rowIndex: r.originalRowIndex,
                column: c.currentName,
                beforeValue: oldVal === '' ? '(Blank)' : oldVal,
                afterValue: replacement,
                operationTitle: op.title,
              });
            }
          });
          if (rowChanged) {
            opAffectedRows++;
            affectedOriginalRowSet.add(r.originalRowIndex);
          }
        });
        break;
      }

      case 'REMOVE_MISSING_ROWS': {
        const targetColObj = resolveColKey(op.targetColumn);
        const colsToCheck = targetColObj ? [targetColObj] : activeCols;
        const kept: typeof activeRows = [];

        activeRows.forEach((r) => {
          const hasMissing = colsToCheck.some((c) => isBlank(r.data[c.originalName]));
          if (hasMissing) {
            opAffectedRows++;
            missingRowsRemoved++;
            affectedOriginalRowSet.add(r.originalRowIndex);
            removedRows.push({
              originalRowIndex: r.originalRowIndex,
              row: { ...r.data },
              reason: targetColObj
                ? `Missing value in column "${targetColObj.currentName}"`
                : 'Contains one or more missing values',
            });
          } else {
            kept.push(r);
          }
        });

        if (opAffectedRows > 0) {
          destructiveWarnings.push(
            `Destructive operation: "${op.title}" will permanently remove ${opAffectedRows} row(s) from the cleaned dataset.`
          );
        }
        activeRows = kept;
        break;
      }

      case 'CONVERT_COLUMN_TYPE': {
        const targetColObj = resolveColKey(op.targetColumn);
        const targetType = op.targetDataType || 'text';
        if (targetColObj) {
          let coercedCount = 0;
          activeRows.forEach((r) => {
            const oldVal = r.data[targetColObj.originalName] ?? '';
            const res = convertValueToType(oldVal, targetType);
            if (res.coercedInvalid) {
              coercedCount++;
            }
            if (res.changed) {
              r.data[targetColObj.originalName] = res.value;
              opAffectedRows++;
              opAffectedCells++;
              typeConversionsCount++;
              affectedOriginalRowSet.add(r.originalRowIndex);
              cellDiffs.push({
                rowIndex: r.originalRowIndex,
                column: targetColObj.currentName,
                beforeValue: oldVal,
                afterValue: res.value === '' ? '(Cleared Invalid Number)' : res.value,
                operationTitle: op.title,
              });
            }
          });
          if (coercedCount > 0) {
            destructiveWarnings.push(
              `Type conversion on "${targetColObj.currentName}" encountered ${coercedCount} unparseable value(s) that were cleared or left uncast.`
            );
          }
        }
        break;
      }
    }

    operationMetrics.push({
      operationId: op.id,
      operationType: op.type,
      title: op.title,
      description: op.description,
      affectedRowsCount: opAffectedRows,
      affectedCellsCount: opAffectedCells,
    });
  });

  const afterColumns = activeCols.map((c) => c.currentName);
  const afterRows: DataRow[] = activeRows.map((r) => {
    const newRow: DataRow = {};
    activeCols.forEach((c) => {
      newRow[c.currentName] = r.data[c.originalName] ?? '';
    });
    return newRow;
  });

  const columnChanges: ColumnChange[] = beforeColumns.map((origCol) => {
    const found = activeCols.find((c) => c.originalName === origCol);
    if (!found) {
      return { beforeName: origCol, afterName: null, changeType: 'removed' };
    }
    if (found.currentName !== origCol) {
      return { beforeName: origCol, afterName: found.currentName, changeType: 'renamed' };
    }
    return { beforeName: origCol, afterName: origCol, changeType: 'unchanged' };
  });

  return {
    operations,
    operationMetrics,
    beforeColumns,
    afterColumns,
    beforeRows,
    afterRows,
    columnChanges,
    cellDiffs,
    removedRows,
    totalAffectedRows: affectedOriginalRowSet.size,
    totalAffectedCells: cellDiffs.length,
    duplicatesRemoved,
    emptyRowsRemoved,
    missingRowsRemoved,
    missingValuesReplaced,
    whitespaceTrimmedCount,
    typeConversionsCount,
    destructiveWarnings,
  };
}

/**
 * Generate CSV text from columns and rows
 */
export function generateCSVContent(columns: string[], rows: DataRow[]): string {
  const dataMatrix = [
    columns,
    ...rows.map((r) => columns.map((col) => r[col] ?? '')),
  ];
  return Papa.unparse(dataMatrix);
}

/**
 * Trigger real browser download of Cleaned CSV
 */
export function downloadCleanedCSV(columns: string[], rows: DataRow[], originalFileName: string): void {
  const csvContent = generateCSVContent(columns, rows);
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const baseName = originalFileName.replace(/\.(csv|xlsx|xls)$/i, '') || 'dataset';
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', `${baseName}_cleaned.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Trigger real browser download of Cleaned Excel XLSX
 */
export function downloadCleanedXLSX(columns: string[], rows: DataRow[], originalFileName: string): void {
  const aoa: string[][] = [
    columns,
    ...rows.map((r) => columns.map((col) => r[col] ?? '')),
  ];
  const worksheet = XLSX.utils.aoa_to_sheet(aoa);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Cleaned_Data');
  const baseName = originalFileName.replace(/\.(csv|xlsx|xls)$/i, '') || 'dataset';
  XLSX.writeFile(workbook, `${baseName}_cleaned.xlsx`);
}

/**
 * Built-in realistic messy sample CSV datasets for instant 1-click testing and verification
 */
export const SAMPLE_MESSY_CUSTOMERS_CSV = `Customer ID ,Full Name,Age,city,Order_Date,Revenue ($),Account_Status,Legacy_Notes
CUST-1001,  Aarav Sharma ,28,Hyderabad,2026-01-14,1250.50,Active,
CUST-1002,Priya Nair,34,,01/18/2026,890.00,Active,
CUST-1001,  Aarav Sharma ,28,Hyderabad,2026-01-14,1250.50,Active,
CUST-1003,Rohan   Verma,42,hyderabad,2026-01-21,TBD,Pending,
,,,,,,,
CUST-1004,Ananya Iyer,,Bengaluru,2026-02-02,$2400.00,ACTIVE,
CUST-1005,Vikram  Reddy ,31,Chennai,02/09/2026,1540.75,Inactive,
CUST-1006,Meera Krishnan,26,,2026-02-11,980.00,Active,
CUST-1007,Karthik Rao,39,BENGALURU,2026-02-15,3100.25,Active,
CUST-1005,Vikram  Reddy ,31,Chennai,02/09/2026,1540.75,Inactive,
CUST-1008,  Divya Patel,29,Pune,2026-02-19,N/A,Pending,
CUST-1009,Siddharth Joshi,35,,2026-02-22,1750.00,Active,`;

export const SAMPLE_HR_RECORDS_CSV = `Emp_ID,Employee Name ,Department,City,Joining Date,Annual Salary,Temp_Column
EMP-01,  Sneha Gupta,Engineering,Mumbai,2025-06-01,95000,
EMP-02,Arjun Mehta,Product,,06/15/2025,112000,
EMP-01,  Sneha Gupta,Engineering,Mumbai,2025-06-01,95000,
EMP-03,Kiran   Desai,engineering,Pune,2025-07-10,pending,
,,,,,,
EMP-04,Neha Kapoor,Design,Bengaluru,2025-08-20,"$105,000",
EMP-05,Rahul Verma,,mumbai,2025-09-05,88000,`;
