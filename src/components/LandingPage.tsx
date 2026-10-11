import React from 'react';
import {
  ArrowRight,
  CheckCircle2,
  Database,
  Download,
  FileSpreadsheet,
  GitCompare,
  Lock,
  ShieldCheck,
  Sliders,
  Sparkles,
  Upload,
} from 'lucide-react';

interface LandingPageProps {
  onGetStarted: () => void;
  onLoadSampleAndStart: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  onGetStarted,
  onLoadSampleAndStart,
}) => {
  return (
    <div className="min-h-screen bg-white text-slate-900 flex flex-col">
      {/* Top Bar Contract: 3 zones separated by gap-8 */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur border-b border-slate-200 px-6 lg:px-12 py-4 flex items-center justify-between gap-8">
        <a
          href="#top"
          className="text-xl font-bold tracking-tight text-slate-950 font-display whitespace-nowrap shrink-0"
        >
          DataTrustAI
        </a>

        <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-600">
          <a
            href="#features"
            className="hover:text-slate-950 hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
          >
            Features
          </a>
          <a
            href="#how-it-works"
            className="hover:text-slate-950 hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
          >
            How It Works
          </a>
          <a
            href="#privacy"
            className="hover:text-slate-950 hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
          >
            Privacy
          </a>
        </nav>

        <div className="flex items-center shrink-0">
          <button
            type="button"
            onClick={onGetStarted}
            className="px-4 py-2 text-sm font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            Get Started
          </button>
        </div>
      </header>

      {/* Hero Section */}
      <section id="top" className="relative bg-slate-950 text-white border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-6 lg:px-12 py-16 lg:py-24 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          <div className="lg:col-span-7 space-y-6">
            <div className="space-y-3">
              <h1
                className="font-display font-extrabold tracking-tight text-white leading-[1.08]"
                style={{ fontSize: 'clamp(2.5rem, 4.5vw, 4rem)' }}
              >
                DataTrustAI
              </h1>

              <p
                className="text-xl lg:text-2xl font-semibold text-teal-400 font-display tracking-tight"
                style={{ textWrap: 'balance' }}
              >
                Clean Data. Confident Decisions.
              </p>
            </div>

            <blockquote className="text-base lg:text-lg text-slate-200 max-w-2xl leading-relaxed font-normal">
              &ldquo;Turn messy data into meaningful insights. DataTrustAI helps you detect errors,
              handle missing values, remove duplicates, and customize your data-cleaning process
              with confidence.&rdquo;
            </blockquote>

            <div className="pt-2 flex flex-wrap items-center gap-4">
              <button
                type="button"
                onClick={onGetStarted}
                className="inline-flex items-center gap-2 px-6 py-3 text-sm font-semibold text-slate-950 bg-teal-400 hover:bg-teal-300 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <span>Get Started</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={onLoadSampleAndStart}
                className="inline-flex items-center gap-2 px-5 py-3 text-sm font-semibold text-white bg-slate-900 border border-slate-700 hover:bg-slate-800 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <FileSpreadsheet className="w-4 h-4 text-sky-400" />
                <span>Load Sample Dataset &amp; Explore</span>
              </button>
            </div>

            <div className="pt-4 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-slate-400">
              <span>100% Browser-Local Execution</span>
              <span aria-hidden="true">·</span>
              <span>CSV &amp; Excel (.xlsx) Support</span>
              <span aria-hidden="true">·</span>
              <span>No Paid API Keys Required</span>
              <span aria-hidden="true">·</span>
              <span>Non-Destructive Undo History</span>
            </div>
          </div>

          {/* Live Data Remediation Preview Panel */}
          <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div>
                <h2 className="text-sm font-semibold text-white">
                  Deterministic Transformation Pipeline
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Every rule is verified with cell-level diffing before execution
                </p>
              </div>
              <span className="text-xs font-mono text-teal-400 tabular-nums">
                Local Engine
              </span>
            </div>

            <div className="space-y-3">
              <div className="text-xs text-slate-400 font-medium">
                Sample Rule Input
              </div>
              <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 font-mono text-xs text-sky-300 leading-relaxed">
                &ldquo;Replace missing City values with Hyderabad, replace missing Age values with
                0, remove duplicate rows, and trim extra spaces from all text columns.&rdquo;
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>Before vs. After Cell Inspection</span>
                <span className="font-mono tabular-nums">4 Rules Matched</span>
              </div>

              <div className="overflow-x-auto border border-slate-800 rounded-lg">
                <table className="w-full text-left border-collapse font-mono text-xs tabular-nums">
                  <thead>
                    <tr className="bg-slate-950 text-slate-400 border-b border-slate-800">
                      <th className="py-2 px-3">Column</th>
                      <th className="py-2 px-3">Raw Input</th>
                      <th className="py-2 px-3">Cleaned Output</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/80 text-slate-200">
                    <tr>
                      <td className="py-2 px-3 text-slate-400">City</td>
                      <td className="py-2 px-3 text-rose-400">(Blank)</td>
                      <td className="py-2 px-3 text-teal-300">&quot;Hyderabad&quot;</td>
                    </tr>
                    <tr>
                      <td className="py-2 px-3 text-slate-400">Age</td>
                      <td className="py-2 px-3 text-rose-400">(Blank)</td>
                      <td className="py-2 px-3 text-teal-300">&quot;0&quot;</td>
                    </tr>
                    <tr>
                      <td className="py-2 px-3 text-slate-400">Full Name</td>
                      <td className="py-2 px-3 text-amber-300">&quot;  Aarav Sharma &quot;</td>
                      <td className="py-2 px-3 text-teal-300">&quot;Aarav Sharma&quot;</td>
                    </tr>
                    <tr>
                      <td className="py-2 px-3 text-slate-400">Row #3</td>
                      <td className="py-2 px-3 text-rose-400">Exact Duplicate</td>
                      <td className="py-2 px-3 text-teal-300">Removed Safely</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Overview Section */}
      <section id="features" className="py-20 px-6 lg:px-12 max-w-7xl mx-auto w-full">
        <div className="max-w-3xl space-y-3 mb-12">
          <p className="text-xs font-semibold text-sky-700 tracking-wide">
            Workspace Capabilities
          </p>
          <h2 className="text-2xl lg:text-3xl font-bold text-slate-900 font-display">
            Built for Verifiable, Auditable Spreadsheet Remediation
          </h2>
          <p className="text-slate-600 text-base leading-relaxed">
            Unlike opaque scripts that overwrite files silently, DataTrustAI pairs side-by-side
            quality diagnostics with an interactive Custom Cleaning Panel so you can preview,
            customize, and approve every change with confidence.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Span 2 card */}
          <div className="lg:col-span-2 bg-slate-50 border border-slate-200 rounded-xl p-8 flex flex-col justify-between space-y-6">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono text-slate-500">01. Diagnostic Engine</span>
                <Database className="w-5 h-5 text-sky-700" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 font-display">
                01. Eight-Dimension Data Quality Profiling
              </h3>
              <p className="text-sm text-slate-600 leading-relaxed max-w-2xl">
                Automatically scans every uploaded CSV and Excel worksheet to count and isolate
                exact duplicate rows, missing or blank cells, completely empty rows, empty columns,
                leading/trailing/internal whitespace, inconsistent column headers, mixed date or
                text casing formats, and invalid non-numeric values inside numeric columns.
              </p>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 border-t border-slate-200 text-xs">
              <div>
                <div className="font-semibold text-slate-900">Duplicate Rows</div>
                <div className="text-slate-500 mt-0.5">Full or subset column check</div>
              </div>
              <div>
                <div className="font-semibold text-slate-900">Missing Values</div>
                <div className="text-slate-500 mt-0.5">Custom, Mean, Median, 0</div>
              </div>
              <div>
                <div className="font-semibold text-slate-900">Numeric Integrity</div>
                <div className="text-slate-500 mt-0.5">Flags invalid strings</div>
              </div>
              <div>
                <div className="font-semibold text-slate-900">Schema Hygiene</div>
                <div className="text-slate-500 mt-0.5">Header &amp; format audit</div>
              </div>
            </div>
          </div>

          {/* Span 1 card */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-8 flex flex-col justify-between space-y-6">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono text-slate-500">02. Custom Cleaning Panel</span>
                <Sliders className="w-5 h-5 text-teal-700" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 font-display">
                02. Interactive &amp; Rule-Based Cleaning
              </h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                Handle missing values column-by-column (custom value, Unknown, 0, mean, median, or
                row removal), configure duplicate detection across all or selected columns, or type
                custom instructions side-by-side with your quality results.
              </p>
            </div>
            <div className="pt-4 border-t border-slate-200 text-xs text-slate-500">
              Zero external API keys or paid LLM tokens required
            </div>
          </div>

          {/* Span 1 card */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-8 flex flex-col justify-between space-y-6">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono text-slate-500">03. Approval Gate</span>
                <GitCompare className="w-5 h-5 text-sky-700" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 font-display">
                03. Before-and-After Diff Review
              </h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                Inspect original row count, expected cleaned row count, missing cells replaced, and
                duplicate rows removed before applying changes. Your original uploaded dataset is
                never modified directly.
              </p>
            </div>
            <div className="pt-4 border-t border-slate-200 text-xs text-slate-500">
              Full session Change History with snapshot restoration
            </div>
          </div>

          {/* Span 2 card */}
          <div className="lg:col-span-2 bg-slate-50 border border-slate-200 rounded-xl p-8 flex flex-col justify-between space-y-6">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono text-slate-500">04. Verified Export</span>
                <Download className="w-5 h-5 text-teal-700" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 font-display">
                04. Instant Cleaned CSV &amp; Excel (.xlsx) Export
              </h3>
              <p className="text-sm text-slate-600 leading-relaxed max-w-2xl">
                Download your cleaned dataset immediately as a standard RFC-4180 CSV file or a
                native Microsoft Excel (.xlsx) workbook containing your exact modified data.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-6 pt-4 border-t border-slate-200 text-xs text-slate-600">
              <span>Clean CSV (.csv) Export</span>
              <span aria-hidden="true">·</span>
              <span>Native Excel (.xlsx) Workbook Export</span>
              <span aria-hidden="true">·</span>
              <span>Complete Operation Audit Summary</span>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="bg-slate-100 border-y border-slate-200 py-20 px-6 lg:px-12">
        <div className="max-w-7xl mx-auto space-y-12">
          <div className="max-w-2xl space-y-3">
            <p className="text-xs font-semibold text-sky-700 tracking-wide">
              Step-by-Step Workflow
            </p>
            <h2 className="text-2xl lg:text-3xl font-bold text-slate-900 font-display">
              How DataTrustAI Works
            </h2>
            <p className="text-slate-600 text-base">
              Four structured stages ensure total visibility from raw upload to verified download.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-3">
              <div className="flex items-center justify-between text-xs font-mono text-slate-500">
                <span>Step 01</span>
                <Upload className="w-4 h-4 text-slate-700" />
              </div>
              <h3 className="text-base font-bold text-slate-900">Upload CSV or XLSX</h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                Select a local CSV or Excel file up to 25 MB, or load our built-in messy benchmark
                dataset to inspect headers, row counts, and raw cell values.
              </p>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-3">
              <div className="flex items-center justify-between text-xs font-mono text-slate-500">
                <span>Step 02</span>
                <Sparkles className="w-4 h-4 text-sky-700" />
              </div>
              <h3 className="text-base font-bold text-slate-900">Inspect Quality Issues</h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                Review exact issue counts across 8 quality dimensions on the left while configuring
                your Custom Cleaning Panel on the right.
              </p>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-3">
              <div className="flex items-center justify-between text-xs font-mono text-slate-500">
                <span>Step 03</span>
                <CheckCircle2 className="w-4 h-4 text-teal-700" />
              </div>
              <h3 className="text-base font-bold text-slate-900">Preview &amp; Customize</h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                Choose column-specific missing value strategies, duplicate removal rules, and custom
                instructions, then preview the before-and-after impact.
              </p>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-3">
              <div className="flex items-center justify-between text-xs font-mono text-slate-500">
                <span>Step 04</span>
                <Download className="w-4 h-4 text-slate-900" />
              </div>
              <h3 className="text-base font-bold text-slate-900">Apply &amp; Download</h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                Apply your cleaning plan to update quality statistics and download the verified
                Cleaned CSV or Cleaned Excel (.xlsx) file immediately.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Privacy-First Processing Section */}
      <section id="privacy" className="py-20 px-6 lg:px-12 max-w-7xl mx-auto w-full">
        <div className="bg-slate-900 text-white rounded-2xl p-8 lg:p-12 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          <div className="lg:col-span-8 space-y-4">
            <div className="flex items-center gap-2 text-xs font-medium text-teal-400">
              <ShieldCheck className="w-4 h-4" />
              <span>Privacy-First Local Architecture</span>
            </div>
            <h2 className="text-2xl lg:text-3xl font-bold font-display">
              Your Spreadsheets Never Leave Your Browser
            </h2>
            <p className="text-slate-300 text-sm lg:text-base leading-relaxed max-w-2xl">
              DataTrustAI processes all CSV and Excel files locally in your browser memory using
              deterministic JavaScript/TypeScript algorithms. Uploaded datasets are never
              transmitted to external AI servers, third-party cloud buckets, or paid API endpoints.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 text-xs text-slate-300">
              <div className="border border-slate-800 rounded-lg p-4 bg-slate-950/60">
                <div className="font-semibold text-white mb-1 flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-teal-400" />
                  <span>Zero External Uploads</span>
                </div>
                <p className="text-slate-400">
                  File parsing, profiling, and export run strictly on the client device.
                </p>
              </div>
              <div className="border border-slate-800 rounded-lg p-4 bg-slate-950/60">
                <div className="font-semibold text-white mb-1">No API Keys Needed</div>
                <p className="text-slate-400">
                  Works out-of-the-box without OpenAI keys, cloud billing, or subscriptions.
                </p>
              </div>
              <div className="border border-slate-800 rounded-lg p-4 bg-slate-950/60">
                <div className="font-semibold text-white mb-1">Safe Ephemeral State</div>
                <p className="text-slate-400">
                  Original data is retained in session memory for instant undo and cleared on exit.
                </p>
              </div>
            </div>
          </div>

          <div className="lg:col-span-4 flex flex-col items-start lg:items-end justify-center space-y-4">
            <button
              type="button"
              onClick={onGetStarted}
              className="w-full sm:w-auto px-6 py-3.5 text-sm font-semibold text-slate-950 bg-white hover:bg-slate-100 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              Launch DataTrustAI Workspace
            </button>
            <p className="text-xs text-slate-400">
              Supports .csv and .xlsx files up to 25 MB
            </p>
          </div>
        </div>
      </section>

      {/* Clean Footer */}
      <footer className="mt-auto bg-slate-950 text-slate-400 border-t border-slate-800 py-10 px-6 lg:px-12">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div className="space-y-1">
            <div className="text-base font-bold text-white font-display">DataTrustAI</div>
            <p className="text-xs text-slate-400">
              Clean Data. Confident Decisions.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-6 text-xs text-slate-400">
            <a href="#features" className="hover:text-white transition-colors">
              Features
            </a>
            <a href="#how-it-works" className="hover:text-white transition-colors">
              How It Works
            </a>
            <a href="#privacy" className="hover:text-white transition-colors">
              Privacy
            </a>
            <button
              type="button"
              onClick={onGetStarted}
              className="text-teal-400 hover:text-teal-300 font-semibold cursor-pointer"
            >
              Open Workspace &rarr;
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
};
