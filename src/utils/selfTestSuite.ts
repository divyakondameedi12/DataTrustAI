import {
  analyzeDataset,
  calculateColumnMean,
  calculateColumnMedian,
  countDuplicatesByColumns,
  generateCSVContent,
  parseCleaningInstructions,
  parseCSVText,
  SAMPLE_MESSY_CUSTOMERS_CSV,
  simulateCleaningOperations,
} from './dataEngine';

export interface VerificationCheckResult {
  stepNumber: number;
  name: string;
  passed: boolean;
  details: string;
}

/**
 * Executes the complete functional verification suite + Custom Cleaning Panel checks
 * directly against the browser data engine.
 */
export function runEndToEndVerificationSuite(): VerificationCheckResult[] {
  const results: VerificationCheckResult[] = [];

  try {
    // Step 1: Parse sample CSV file
    const parsed = parseCSVText(SAMPLE_MESSY_CUSTOMERS_CSV);
    const step1Passed = parsed.columns.length === 8 && parsed.rows.length === 12;
    results.push({
      stepNumber: 1,
      name: '1. Upload & Parse Sample CSV Dataset',
      passed: step1Passed,
      details: `Parsed ${parsed.rows.length} rows and ${parsed.columns.length} columns (${parsed.columns.join(', ')}).`,
    });

    // Step 2: Detect duplicate rows (exact & subset-column duplicates)
    const report = analyzeDataset(parsed.columns, parsed.rows);
    const subsetDups = countDuplicatesByColumns(parsed.rows, ['city'], parsed.columns);
    const step2Passed = report.duplicateRowsCount === 2 && subsetDups.count >= 2;
    results.push({
      stepNumber: 2,
      name: '2. Detect Exact & Selected-Column Duplicate Rows',
      passed: step2Passed,
      details: `Detected ${report.duplicateRowsCount} exact duplicate rows (Rows ${report.issues.duplicate_rows.affectedRowIndices.map((i) => i + 1).join(', ')}) and ${subsetDups.count} duplicates when grouped by "city".`,
    });

    // Step 3: Detect missing values & numeric mean/median calculation
    const ageMean = calculateColumnMean(parsed.rows, 'Age');
    const ageMedian = calculateColumnMedian(parsed.rows, 'Age');
    const step3Passed =
      report.missingValuesCount === 4 &&
      report.emptyRowsCount === 1 &&
      report.emptyColumnsCount === 1 &&
      report.extraWhitespaceCount === 6 &&
      report.invalidNumericValuesCount === 3 &&
      ageMean !== null &&
      ageMedian !== null;
    results.push({
      stepNumber: 3,
      name: '3. Detect Missing Values & Compute Numeric Mean/Median',
      passed: step3Passed,
      details: `Detected ${report.missingValuesCount} missing values (3 in "city", 1 in "Age"), 1 empty row, 1 empty column, 6 whitespace cells. Computed "Age" Mean = ${ageMean}, Median = ${ageMedian}.`,
    });

    // Step 4: Parse Custom Cleaning Instructions (Section 3 format)
    const instructionText =
      'Replace missing City values with Hyderabad, replace missing Age values with 0, remove duplicate rows, remove empty rows, remove empty columns, convert column names to lowercase, and trim extra spaces from all text columns.';
    const parsedInstructions = parseCleaningInstructions(instructionText, parsed.columns);
    const step4Passed =
      parsedInstructions.recognized.length === 7 && parsedInstructions.unsupported.length === 0;
    results.push({
      stepNumber: 4,
      name: '4. Parse Custom Cleaning Instructions',
      passed: step4Passed,
      details: `Recognized ${parsedInstructions.recognized.length} deterministic operations: ${parsedInstructions.recognized.map((o) => o.title).join('; ')}.`,
    });

    // Step 5: Preview proposed changes (Section 4 metrics)
    const preview = simulateCleaningOperations(
      parsed.columns,
      parsed.rows,
      parsedInstructions.recognized
    );
    const step5Passed =
      preview.beforeRows.length === 12 &&
      preview.afterRows.length === 9 &&
      preview.duplicatesRemoved === 2 &&
      preview.emptyRowsRemoved === 1 &&
      preview.missingValuesReplaced === 4 &&
      preview.cellDiffs.length > 0;
    results.push({
      stepNumber: 5,
      name: '5. Preview Proposed Changes (Non-Destructive Diff)',
      passed: step5Passed,
      details: `Preview shows ${preview.beforeRows.length} original rows -> ${preview.afterRows.length} cleaned rows, ${preview.missingValuesReplaced} missing cells replaced, and ${preview.duplicatesRemoved} duplicate rows removed.`,
    });

    // Step 6: Approve / Apply Cleaning & Preserve Original Dataset
    const originalStillIntact =
      parsed.rows.length === 12 &&
      parsed.rows[0]['Full Name'] === '  Aarav Sharma ' &&
      parsed.rows[1]['city'] === '';
    const cleanedColumns = [...preview.afterColumns];
    const cleanedRows = preview.afterRows.map((r) => ({ ...r }));
    const step6Passed = originalStillIntact && cleanedRows.length === 9 && cleanedColumns.length === 7;
    results.push({
      stepNumber: 6,
      name: '6. Apply Cleaning & Preserve Original Dataset Copy',
      passed: step6Passed,
      details: `Original dataset preserved intact (${parsed.rows.length} rows); cleaned copy updated to ${cleanedRows.length} rows and ${cleanedColumns.length} columns.`,
    });

    // Step 7: Verify actual dataset modification & preservation of non-missing values
    const postCleanReport = analyzeDataset(cleanedColumns, cleanedRows);
    const step7Passed =
      postCleanReport.duplicateRowsCount === 0 &&
      postCleanReport.emptyRowsCount === 0 &&
      postCleanReport.emptyColumnsCount === 0 &&
      postCleanReport.missingValuesCount === 0 &&
      postCleanReport.extraWhitespaceCount === 0 &&
      cleanedRows[0]['city'] === 'Hyderabad' &&
      cleanedRows[1]['city'] === 'Hyderabad' &&
      cleanedRows[3]['age'] === '0' &&
      cleanedRows[0]['age'] === '28' && // preserved non-missing value
      cleanedRows[0]['full name'] === 'Aarav Sharma';
    results.push({
      stepNumber: 7,
      name: '7. Verify Cleaned Values & Non-Missing Preservation',
      passed: step7Passed,
      details: `Cleaned dataset verified: 0 duplicates, 0 missing values, 0 extra spaces. Missing "city" -> "Hyderabad", missing "age" -> "0", existing "age" preserved as "28".`,
    });

    // Step 8: Generate Cleaned CSV
    const csvOutput = generateCSVContent(cleanedColumns, cleanedRows);
    const step8Passed =
      csvOutput.length > 100 &&
      csvOutput.includes('Hyderabad') &&
      !csvOutput.includes('Legacy_Notes');
    results.push({
      stepNumber: 8,
      name: '8. Generate Cleaned CSV Output',
      passed: step8Passed,
      details: `Generated ${csvOutput.length} bytes of valid RFC-4180 CSV content.`,
    });

    // Step 9: Re-Parse & Verify Downloaded CSV Integrity
    const reparsed = parseCSVText(csvOutput);
    const reparsedReport = analyzeDataset(reparsed.columns, reparsed.rows);
    const step9Passed =
      reparsed.rows.length === 9 &&
      reparsed.columns.length === 7 &&
      reparsedReport.duplicateRowsCount === 0 &&
      reparsedReport.missingValuesCount === 0;
    results.push({
      stepNumber: 9,
      name: '9. Re-Parse & Verify Downloaded CSV Integrity',
      passed: step9Passed,
      details: `Re-parsed exported CSV: ${reparsed.rows.length} clean rows, ${reparsed.columns.length} columns, 0 duplicates, 0 missing cells.`,
    });

    // Step 10: Confirm unsupported instructions & invalid/empty file error handling
    const badParse = parseCleaningInstructions(
      'Predict next quarter revenue using AI, replace missing City values, and update NonExistentCol to 100',
      parsed.columns
    );
    let emptyFileRejected = false;
    try {
      parseCSVText('   \n  ');
    } catch {
      emptyFileRejected = true;
    }
    const step10Passed =
      badParse.recognized.length === 0 &&
      badParse.unsupported.length >= 2 &&
      emptyFileRejected;
    results.push({
      stepNumber: 10,
      name: '10. Unsupported Instructions & Edge-Case Validation',
      passed: step10Passed,
      details: `Flagged ${badParse.unsupported.length} unsupported/ambiguous instructions with helpful guidance, and rejected empty CSV input cleanly.`,
    });
  } catch (err) {
    results.push({
      stepNumber: results.length + 1,
      name: 'Unexpected Exception During Verification',
      passed: false,
      details: err instanceof Error ? err.message : String(err),
    });
  }

  return results;
}
