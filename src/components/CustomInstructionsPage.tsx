import React, { useEffect, useState } from 'react';
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Info,
  Play,
  Plus,
  RotateCcw,
  Upload,
} from 'lucide-react';
import {
  PageId,
  ParsedInstructionResult,
  SessionDatasetRecord,
  SupportedTargetType,
} from '../types/data';
import { parseCleaningInstructions } from '../utils/dataEngine';

interface CustomInstructionsPageProps {
  activeDataset: SessionDatasetRecord | null;
  instructionText: string;
  onChangeInstructionText: (text: string) => void;
  onSubmitForReview: (parsed: ParsedInstructionResult) => void;
  onNavigate: (page: PageId) => void;
}

export const CustomInstructionsPage: React.FC<CustomInstructionsPageProps> = ({
  activeDataset,
  instructionText,
  onChangeInstructionText,
  onSubmitForReview,
  onNavigate,
}) => {
  const [parsedResult, setParsedResult] = useState<ParsedInstructionResult | null>(null);
  const [hasSubmittedOnce, setHasSubmittedOnce] = useState(false);

  // Interactive helper states for column-specific rules
  const [selectedMissingCol, setSelectedMissingCol] = useState<string>('');
  const [missingReplacementVal, setMissingReplacementVal] = useState<string>('Unknown');
  const [selectedConvertCol, setSelectedConvertCol] = useState<string>('');
  const [selectedConvertType, setSelectedConvertType] = useState<SupportedTargetType>('number');

  useEffect(() => {
    if (activeDataset && activeDataset.currentColumns.length > 0) {
      const firstMissing =
        activeDataset.currentReport.issues.missing_values.affectedColumns[0] ||
        activeDataset.currentColumns[0];
      setSelectedMissingCol(firstMissing);

      const firstNumeric =
        activeDataset.currentReport.issues.invalid_numeric_values.affectedColumns[0] ||
        activeDataset.currentColumns[0];
      setSelectedConvertCol(firstNumeric);
    }
  }, [activeDataset]);

  if (!activeDataset) {
    return (
      <div className="bg-white border border-slate-200 rounded-xl p-10 text-center space-y-4">
        <h1 className="text-xl font-bold text-slate-900 font-display">
          No Dataset Loaded for Cleaning Instructions
        </h1>
        <p className="text-sm text-slate-600 max-w-md mx-auto">
          Upload a CSV or Excel dataset first to write and validate custom cleaning instructions
          against actual column names.
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

  const appendClause = (clause: string) => {
    const trimmed = instructionText.trim();
    if (!trimmed) {
      onChangeInstructionText(clause + '.');
    } else {
      const withoutTrailingDot = trimmed.replace(/\.$/, '');
      onChangeInstructionText(`${withoutTrailingDot}, and ${clause.charAt(0).toLowerCase() + clause.slice(1)}.`);
    }
  };

  const handleParseAndSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const res = parseCleaningInstructions(instructionText, activeDataset.currentColumns);
    setParsedResult(res);
    setHasSubmittedOnce(true);
  };

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 font-display">
            Custom Cleaning Instructions
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Specify deterministic cleaning rules for{' '}
            <span className="font-semibold text-slate-900">{activeDataset.fileName}</span>.
            DataTrustAI parses each instruction safely without external AI keys or arbitrary code
            execution.
          </p>
        </div>

        {parsedResult && parsedResult.recognized.length > 0 && (
          <button
            type="button"
            onClick={() => onSubmitForReview(parsedResult)}
            className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-sky-600 hover:bg-sky-700 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <span>Preview Changes in Review Screen</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Honest Rule-Based Engine Notice */}
      <div className="bg-slate-900 text-slate-200 rounded-xl p-4 flex items-start gap-3 text-xs leading-relaxed">
        <Info className="w-4 h-4 text-teal-400 shrink-0 mt-0.5" />
        <div>
          <span className="font-semibold text-white">
            Deterministic Rule-Based Parser (No Paid AI Key Required):
          </span>{' '}
          This workspace uses a deterministic grammar parser that supports 10 verified spreadsheet
          cleaning operations. It does not claim unrestricted free-form LLM understanding, never
          invents replacement values, and clearly reports any unrecognized or ambiguous instruction.
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Prominent Textbox & Form */}
        <form onSubmit={handleParseAndSubmit} className="lg:col-span-7 space-y-5">
          <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <label
                htmlFor="custom-instructions-textarea"
                className="text-base font-bold text-slate-900 font-display"
              >
                Tell DataTrustAI What to Change
              </label>
              <button
                type="button"
                onClick={() => {
                  onChangeInstructionText('');
                  setParsedResult(null);
                  setHasSubmittedOnce(false);
                }}
                className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-slate-800 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Clear</span>
              </button>
            </div>

            <textarea
              id="custom-instructions-textarea"
              rows={5}
              value={instructionText}
              onChange={(e) => onChangeInstructionText(e.target.value)}
              placeholder="Remove duplicate rows, trim extra spaces, convert column names to lowercase, and replace missing City values with Unknown."
              className="w-full p-4 text-sm font-mono bg-slate-50 border border-slate-300 rounded-xl text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:border-sky-600 focus:ring-2 focus:ring-sky-600/20 leading-relaxed"
            />

            <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const firstMissing =
                      activeDataset.currentReport.issues.missing_values.affectedColumns[0] ||
                      activeDataset.currentColumns[0] ||
                      'City';
                    const example = `Remove duplicate rows, remove empty rows, remove empty columns, trim extra spaces, convert column names to lowercase, and replace missing ${firstMissing.trim()} values with Unknown.`;
                    onChangeInstructionText(example);
                    const res = parseCleaningInstructions(example, activeDataset.currentColumns);
                    setParsedResult(res);
                    setHasSubmittedOnce(true);
                  }}
                  className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors cursor-pointer"
                >
                  Fill Recommended Instructions
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const unsupportedExample =
                      'Remove duplicate rows, predict next month sales using AI, and replace missing City values.';
                    onChangeInstructionText(unsupportedExample);
                    const res = parseCleaningInstructions(
                      unsupportedExample,
                      activeDataset.currentColumns
                    );
                    setParsedResult(res);
                    setHasSubmittedOnce(true);
                  }}
                  className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors cursor-pointer"
                >
                  Test Unsupported Instruction Alert
                </button>
              </div>

              <button
                type="submit"
                className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Play className="w-4 h-4" />
                <span>Submit Instructions</span>
              </button>
            </div>
          </div>

          {/* Parsed Instructions Feedback Panel */}
          {hasSubmittedOnce && parsedResult && (
            <div className="space-y-4">
              {/* Empty Input Warning */}
              {parsedResult.recognized.length === 0 && parsedResult.unsupported.length === 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-xs text-amber-900">
                  Please enter at least one cleaning instruction before submitting.
                </div>
              )}

              {/* Recognized Operations */}
              {parsedResult.recognized.length > 0 && (
                <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-5 h-5 text-teal-600" />
                      <h2 className="text-base font-bold text-slate-900 font-display">
                        Recognized Cleaning Operations ({parsedResult.recognized.length})
                      </h2>
                    </div>
                    <span className="text-xs font-mono text-teal-700">Ready for Preview</span>
                  </div>

                  <div className="divide-y divide-slate-200">
                    {parsedResult.recognized.map((op, index) => (
                      <div key={op.id} className="py-3 flex items-start justify-between gap-4">
                        <div className="space-y-1">
                          <div className="text-sm font-semibold text-slate-900">
                            {index + 1}. {op.title}
                          </div>
                          <p className="text-xs text-slate-600">{op.description}</p>
                          <div className="text-[11px] font-mono text-slate-400">
                            Matched clause: &ldquo;{op.rawText}&rdquo;
                          </div>
                        </div>
                        {op.isDestructive && (
                          <span className="text-[11px] font-semibold text-amber-700 shrink-0">
                            Destructive Warning
                          </span>
                        )}
                      </div>
                    ))}
                  </div>

                  <div className="pt-3 border-t border-slate-200 flex items-center justify-end">
                    <button
                      type="button"
                      onClick={() => onSubmitForReview(parsedResult)}
                      className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-sky-600 hover:bg-sky-700 rounded-lg transition-colors cursor-pointer"
                    >
                      <span>Review &amp; Approve Proposed Changes</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              {/* Ambiguous or Unsupported Instructions */}
              {parsedResult.unsupported.length > 0 && (
                <div
                  role="alert"
                  className="bg-rose-50 border border-rose-200 rounded-xl p-6 space-y-4 text-rose-950"
                >
                  <div className="flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                    <div>
                      <h3 className="text-base font-bold font-display text-rose-950">
                        Ambiguous or Unsupported Instructions ({parsedResult.unsupported.length})
                      </h3>
                      <p className="text-xs text-rose-800 mt-0.5">
                        DataTrustAI only executes deterministic, verifiable operations. Please revise
                        the following clause(s) or select a supported operation on the right:
                      </p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {parsedResult.unsupported.map((u, idx) => (
                      <div
                        key={idx}
                        className="bg-white border border-rose-200 rounded-lg p-3.5 space-y-1.5 text-xs"
                      >
                        <div className="font-mono font-semibold text-rose-900">
                          Unrecognized clause: &ldquo;{u.rawText}&rdquo;
                        </div>
                        <p className="text-slate-700">
                          <span className="font-semibold">Why:</span> {u.reason}
                        </p>
                        <p className="text-teal-800">
                          <span className="font-semibold">How to fix:</span> {u.suggestion}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </form>

        {/* Right Column: Interactive Supported Operations Catalog & Rule Builders */}
        <div className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-6 space-y-6">
          <div>
            <h2 className="text-base font-bold text-slate-900 font-display">
              Supported Deterministic Operations
            </h2>
            <p className="text-xs text-slate-600 mt-1">
              Click any operation below to append its exact rule syntax to your instructions box.
            </p>
          </div>

          {/* 1-Click Global Operations */}
          <div className="space-y-2">
            <div className="text-xs font-semibold text-slate-700">
              Row, Whitespace &amp; Header Hygiene
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {[
                { label: 'Remove duplicate rows', clause: 'Remove duplicate rows' },
                { label: 'Trim extra spaces', clause: 'Trim extra spaces' },
                { label: 'Lowercase column names', clause: 'Convert column names to lowercase' },
                { label: 'Uppercase column names', clause: 'Convert column names to uppercase' },
                { label: 'Standardize column names', clause: 'Standardize column names' },
                { label: 'Remove empty rows', clause: 'Remove empty rows' },
                { label: 'Remove empty columns', clause: 'Remove empty columns' },
                {
                  label: 'Remove rows with missing values',
                  clause: 'Remove rows containing missing values',
                },
              ].map((item) => (
                <button
                  key={item.label}
                  type="button"
                  onClick={() => appendClause(item.clause)}
                  className="flex items-center justify-between px-3 py-2 text-xs font-medium text-slate-800 bg-slate-50 border border-slate-200 hover:bg-slate-100 rounded-lg text-left transition-colors cursor-pointer"
                >
                  <span className="truncate">{item.label}</span>
                  <Plus className="w-3.5 h-3.5 text-sky-700 shrink-0 ml-1.5" />
                </button>
              ))}
            </div>
          </div>

          {/* Parameterized Rule Builder 1: Replace Missing Values in Column */}
          <div className="pt-4 border-t border-slate-200 space-y-3">
            <div className="text-xs font-semibold text-slate-700">
              Replace Missing Values in a Specific Column
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div>
                <label className="block text-[11px] text-slate-500 mb-1">Target Column</label>
                <select
                  value={selectedMissingCol}
                  onChange={(e) => setSelectedMissingCol(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg text-slate-900"
                >
                  {activeDataset.currentColumns.map((col) => (
                    <option key={col} value={col}>
                      {col}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[11px] text-slate-500 mb-1">
                  User-Provided Replacement
                </label>
                <input
                  type="text"
                  value={missingReplacementVal}
                  onChange={(e) => setMissingReplacementVal(e.target.value)}
                  placeholder="e.g. Unknown or 0"
                  className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg text-slate-900"
                />
              </div>
            </div>
            <button
              type="button"
              disabled={!selectedMissingCol || !missingReplacementVal.trim()}
              onClick={() =>
                appendClause(
                  `Replace missing ${selectedMissingCol.trim()} values with ${missingReplacementVal.trim()}`
                )
              }
              className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer disabled:opacity-40"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>
                Add: &ldquo;Replace missing {selectedMissingCol.trim()} values with{' '}
                {missingReplacementVal.trim() || '...'}&rdquo;
              </span>
            </button>
          </div>

          {/* Parameterized Rule Builder 2: Convert Column to Supported Data Type */}
          <div className="pt-4 border-t border-slate-200 space-y-3">
            <div className="text-xs font-semibold text-slate-700">
              Convert a Column to a Supported Data Type
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div>
                <label className="block text-[11px] text-slate-500 mb-1">Target Column</label>
                <select
                  value={selectedConvertCol}
                  onChange={(e) => setSelectedConvertCol(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg text-slate-900"
                >
                  {activeDataset.currentColumns.map((col) => (
                    <option key={col} value={col}>
                      {col}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[11px] text-slate-500 mb-1">Target Data Type</label>
                <select
                  value={selectedConvertType}
                  onChange={(e) => setSelectedConvertType(e.target.value as SupportedTargetType)}
                  className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg text-slate-900"
                >
                  <option value="number">number (float/decimal)</option>
                  <option value="integer">integer (rounded whole number)</option>
                  <option value="date">date (ISO YYYY-MM-DD)</option>
                  <option value="titlecase">titlecase (Standardized Title Case)</option>
                  <option value="uppercase">uppercase (ALL CAPS)</option>
                  <option value="lowercase">lowercase (all lowercase)</option>
                  <option value="boolean">boolean (true / false)</option>
                  <option value="text">text (clean string)</option>
                </select>
              </div>
            </div>
            <button
              type="button"
              disabled={!selectedConvertCol}
              onClick={() =>
                appendClause(`Convert ${selectedConvertCol.trim()} to ${selectedConvertType}`)
              }
              className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer disabled:opacity-40"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>
                Add: &ldquo;Convert {selectedConvertCol.trim()} to {selectedConvertType}&rdquo;
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
