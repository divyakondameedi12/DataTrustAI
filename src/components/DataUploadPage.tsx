import React, { useRef, useState } from 'react';
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  FileSpreadsheet,
  RefreshCw,
  ShieldCheck,
  Trash2,
  Upload,
} from 'lucide-react';
import { PageId, SessionDatasetRecord } from '../types/data';
import { DataTableView } from './DataTableView';

interface DataUploadPageProps {
  activeDataset: SessionDatasetRecord | null;
  onUploadFile: (file: File) => Promise<void>;
  onLoadSampleDataset: (sampleType: 'customers' | 'hr') => void;
  onRemoveActiveDataset: () => void;
  onNavigate: (page: PageId) => void;
}

export const DataUploadPage: React.FC<DataUploadPageProps> = ({
  activeDataset,
  onUploadFile,
  onLoadSampleDataset,
  onRemoveActiveDataset,
  onNavigate,
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleFileSelection = async (file: File | undefined) => {
    if (!file) return;
    setErrorMessage(null);
    setSuccessMessage(null);
    setIsLoading(true);
    try {
      await onUploadFile(file);
      setSuccessMessage(
        `Successfully parsed "${file.name}" locally in your browser.`
      );
    } catch (err) {
      setErrorMessage(
        err instanceof Error
          ? err.message
          : 'An unexpected error occurred while reading the file.'
      );
    } finally {
      setIsLoading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleSimulateInvalidUpload = async (mode: 'empty' | 'unsupported') => {
    if (mode === 'empty') {
      const emptyFile = new File([''], 'empty_test_file.csv', { type: 'text/csv' });
      await handleFileSelection(emptyFile);
    } else {
      const badFile = new File(['{"hello":"world"}'], 'unsupported_data.json', {
        type: 'application/json',
      });
      await handleFileSelection(badFile);
    }
  };

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 font-display">
            Data Upload &amp; Schema Inspection
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Upload a CSV (.csv) or Microsoft Excel (.xlsx, .xls) file up to 25 MB for local
            browser-based analysis.
          </p>
        </div>

        {activeDataset && (
          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={() => onNavigate('quality')}
              className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <span>Analyze Data Quality</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Privacy Notice Banner */}
      <div className="bg-slate-900 text-slate-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start sm:items-center gap-3">
          <ShieldCheck className="w-5 h-5 text-teal-400 shrink-0 mt-0.5 sm:mt-0" />
          <div className="text-xs leading-relaxed">
            <span className="font-semibold text-white">Local-Only Privacy Guarantee:</span>{' '}
            Uploaded files are read directly via the HTML5 FileReader API inside your browser tab.
            Your dataset is never uploaded to any external server or third-party AI service.
          </div>
        </div>
        <span className="text-xs font-mono text-teal-400 whitespace-nowrap shrink-0">
          Max Size: 25 MB
        </span>
      </div>

      {/* Error Notification */}
      {errorMessage && (
        <div
          role="alert"
          className="bg-rose-50 border border-rose-200 rounded-xl p-4 flex items-start justify-between gap-4 text-rose-900"
        >
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div className="space-y-1 text-xs">
              <div className="font-bold text-sm">File Validation Error</div>
              <p className="text-rose-800 leading-relaxed">{errorMessage}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setErrorMessage(null)}
            className="text-xs font-semibold text-rose-700 hover:text-rose-900 cursor-pointer shrink-0"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Success Notification */}
      {successMessage && (
        <div
          role="status"
          className="bg-teal-50 border border-teal-200 rounded-xl p-4 flex items-start justify-between gap-4 text-teal-950"
        >
          <div className="flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-teal-600 shrink-0 mt-0.5" />
            <div className="space-y-1 text-xs">
              <div className="font-bold text-sm">Dataset Loaded Successfully</div>
              <p className="text-teal-800">{successMessage}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setSuccessMessage(null)}
            className="text-xs font-semibold text-teal-700 hover:text-teal-900 cursor-pointer shrink-0"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* File Dropzone & Quick Sample Loader */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setIsDragging(false);
            const droppedFile = e.dataTransfer.files?.[0];
            void handleFileSelection(droppedFile);
          }}
          className={`lg:col-span-7 bg-white border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center text-center transition-colors ${
            isDragging
              ? 'border-sky-600 bg-sky-50/50'
              : 'border-slate-300 hover:border-slate-400'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.xlsx,.xls,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
            onChange={(e) => {
              const selected = e.target.files?.[0];
              void handleFileSelection(selected);
            }}
            className="hidden"
            id="dataset-file-input"
          />

          <div className="w-12 h-12 rounded-xl bg-slate-100 text-slate-800 flex items-center justify-center mb-4">
            <Upload className="w-6 h-6" />
          </div>

          <h2 className="text-base font-bold text-slate-900 font-display">
            {activeDataset ? 'Replace Current Dataset' : 'Select or Drag & Drop Your File'}
          </h2>
          <p className="text-xs text-slate-500 mt-1 max-w-md leading-relaxed">
            Supports comma-separated values (.csv) and Excel workbooks (.xlsx, .xls). Maximum file
            size is 25 MB.
          </p>

          <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              disabled={isLoading}
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
            >
              <Upload className="w-4 h-4" />
              <span>{isLoading ? 'Parsing File...' : 'Browse Computer for CSV / XLSX'}</span>
            </button>
          </div>
        </div>

        {/* Sample Datasets & Validation Test Triggers */}
        <div className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-6 flex flex-col justify-between space-y-5">
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-slate-900 font-display">
              Instant Benchmark &amp; Validation Datasets
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Want to test DataTrustAI immediately? Load a realistic messy dataset containing
              duplicate rows, missing cells, empty rows/columns, extra spaces, and unformatted
              numbers:
            </p>

            <div className="space-y-2.5 pt-1">
              <button
                type="button"
                onClick={() => {
                  setErrorMessage(null);
                  onLoadSampleDataset('customers');
                  setSuccessMessage(
                    'Loaded sample "messy_customer_orders_2026.csv" (12 rows, 8 columns).'
                  );
                }}
                className="w-full flex items-center justify-between p-3 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-left transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <FileSpreadsheet className="w-4 h-4 text-sky-700 shrink-0" />
                  <div className="truncate">
                    <div className="text-xs font-semibold text-slate-900 truncate">
                      messy_customer_orders_2026.csv
                    </div>
                    <div className="text-[11px] text-slate-500">
                      12 rows &middot; 8 cols &middot; Duplicates, missing City &amp; Age, invalid Revenue
                    </div>
                  </div>
                </div>
                <span className="text-xs font-semibold text-sky-700 shrink-0 ml-2">Load</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setErrorMessage(null);
                  onLoadSampleDataset('hr');
                  setSuccessMessage(
                    'Loaded sample "hr_employee_roster_raw.csv" (7 rows, 7 columns).'
                  );
                }}
                className="w-full flex items-center justify-between p-3 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-left transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <FileSpreadsheet className="w-4 h-4 text-teal-700 shrink-0" />
                  <div className="truncate">
                    <div className="text-xs font-semibold text-slate-900 truncate">
                      hr_employee_roster_raw.csv
                    </div>
                    <div className="text-[11px] text-slate-500">
                      7 rows &middot; 7 cols &middot; Empty column, extra spaces, mixed dates
                    </div>
                  </div>
                </div>
                <span className="text-xs font-semibold text-teal-700 shrink-0 ml-2">Load</span>
              </button>
            </div>
          </div>

          {/* Edge-Case Validation Triggers */}
          <div className="pt-4 border-t border-slate-200 space-y-2">
            <div className="text-[11px] font-medium text-slate-500">
              Test Error Handling (Empty File &amp; Invalid Format Validation):
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => void handleSimulateInvalidUpload('empty')}
                className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors cursor-pointer"
              >
                Test 0-Byte Empty File
              </button>
              <button
                type="button"
                onClick={() => void handleSimulateInvalidUpload('unsupported')}
                className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors cursor-pointer"
              >
                Test Invalid (.json) Format
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Uploaded File Metadata & Data Preview */}
      {activeDataset && (
        <div className="space-y-6">
          {/* File Summary & Removal / Replacement Controls */}
          <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-sky-50 text-sky-700 flex items-center justify-center shrink-0">
                  <FileSpreadsheet className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900 font-display">
                    {activeDataset.fileName}
                  </h2>
                  <div className="text-xs text-slate-500 font-mono tabular-nums mt-0.5">
                    Format: {activeDataset.fileType} &middot; Size:{' '}
                    {Math.max(1, Math.round(activeDataset.fileSize / 1024))} KB &middot; Uploaded:{' '}
                    {activeDataset.uploadedAt}
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2.5 shrink-0">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Replace File</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onRemoveActiveDataset();
                    setSuccessMessage(null);
                  }}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-rose-700 bg-rose-50 border border-rose-200 hover:bg-rose-100 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Remove Dataset</span>
                </button>
              </div>
            </div>

            {/* Row & Column Counts + Detected Column Names */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
              <div className="md:col-span-4 grid grid-cols-2 gap-4">
                <div className="p-4 rounded-lg bg-slate-50 border border-slate-200">
                  <div className="text-xs text-slate-500">Row Count</div>
                  <div className="text-2xl font-bold text-slate-900 font-mono tabular-nums mt-1">
                    {activeDataset.currentRows.length.toLocaleString()}
                  </div>
                </div>
                <div className="p-4 rounded-lg bg-slate-50 border border-slate-200">
                  <div className="text-xs text-slate-500">Column Count</div>
                  <div className="text-2xl font-bold text-slate-900 font-mono tabular-nums mt-1">
                    {activeDataset.currentColumns.length.toLocaleString()}
                  </div>
                </div>
              </div>

              <div className="md:col-span-8 space-y-2">
                <div className="text-xs font-semibold text-slate-700">
                  Detected Column Names ({activeDataset.currentColumns.length})
                </div>
                <div className="overflow-x-auto border border-slate-200 rounded-lg">
                  <table className="w-full text-left border-collapse text-xs font-mono tabular-nums">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-slate-600">
                        <th className="py-2 px-3">#</th>
                        <th className="py-2 px-3">Raw Column Name</th>
                        <th className="py-2 px-3">Inferred Type</th>
                        <th className="py-2 px-3 text-right">Non-Empty</th>
                        <th className="py-2 px-3 text-right">Missing</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {activeDataset.currentReport.columnProfiles.map((prof, i) => (
                        <tr key={prof.name} className="hover:bg-slate-50/70">
                          <td className="py-1.5 px-3 text-slate-400">{i + 1}</td>
                          <td className="py-1.5 px-3 font-semibold text-slate-900">
                            {prof.name !== prof.name.trim() ? `"${prof.name}"` : prof.name}
                          </td>
                          <td className="py-1.5 px-3 text-slate-600">{prof.inferredType}</td>
                          <td className="py-1.5 px-3 text-right text-slate-700">
                            {prof.nonEmptyCount}
                          </td>
                          <td className="py-1.5 px-3 text-right text-slate-700">
                            {prof.missingCount}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>

          {/* Preview of Uploaded Data */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900 font-display">
                Uploaded Dataset Preview
              </h3>
              <span className="text-xs text-slate-500">
                Showing actual uploaded file contents (leading/trailing spaces highlighted)
              </span>
            </div>
            <DataTableView
              columns={activeDataset.currentColumns}
              rows={activeDataset.currentRows}
              showWhitespaceMarkers={true}
            />
          </div>
        </div>
      )}
    </div>
  );
};
