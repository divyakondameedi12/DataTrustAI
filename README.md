# DataTrustAI

**Tagline:** Clean Data. Confident Decisions.

Developed for **Tri-City AI-Thon 2026**
- **Track:** SaaSsum AI (IT & AI)
- **Team Name:** InfynAI
- **Team ID:** TRI26101
- **Team Leader:** Divya Kondameedi
- **Team Member:** Aerabelly Indhupriya

---

## Overview

**DataTrustAI** is a privacy-first, browser-based data quality analysis and deterministic spreadsheet cleaning workspace for CSV (`.csv`) and Microsoft Excel (`.xlsx`, `.xls`) datasets.

All file parsing, quality profiling, instruction parsing, before/after diff simulation, and file exports run **100% locally in the browser** using deterministic TypeScript algorithms (`PapaParse` and `SheetJS / xlsx`). No paid external AI APIs, API keys, or cloud databases are required, and user datasets never leave the client device.

---

## Complete 8-Page Workspace

1. **Landing Page:** Introduces DataTrustAI, problem & solution overview, 4-stage workflow, privacy-first guarantees, and Team InfynAI (`TRI26101`) details.
2. **Dashboard:** Displays real session statistics (Total rows analyzed, Duplicate rows detected, Missing values detected, Data quality summary, and Recent files processed). Shows `0` and an honest empty state before files are uploaded.
3. **Data Upload:** Supports local `.csv`, `.xlsx`, and `.xls` uploads up to 25 MB with file-size and format validation, schema inspection, data preview, file replacement/removal, and 1-click benchmark datasets.
4. **Data Quality Analysis:** Scans the uploaded dataset across all 8 required quality dimensions:
   - Exact duplicate rows
   - Missing or blank values
   - Empty rows
   - Empty columns
   - Extra whitespace (leading, trailing, or multiple consecutive internal spaces)
   - Inconsistent column names
   - Potentially inconsistent data formats (mixed date formats or inconsistent text casing)
   - Numeric columns containing invalid values
5. **Custom Cleaning Instructions:** Provides the *"Tell DataTrustAI What to Change"* rule input alongside interactive rule builders. Supports 10 deterministic operations, clearly lists recognized rules, and flags unsupported or ambiguous instructions with helpful guidance.
6. **Review and Approval:** Simulates proposed operations without mutating the original dataset. Displays affected row and cell counts, destructive operation warnings, and cell-level before/after diffs with **Approve and Clean**, **Edit Instructions**, and **Cancel** actions.
7. **Cleaned Dataset:** Displays the cleaned table, before/after row and issue counts, column schema changes, and working **Download Cleaned CSV** and **Download Cleaned Excel (.xlsx)** buttons.
8. **Change History:** Logs every approved batch in the current session with **Undo Last Batch**, **Revert to This Point**, **Reset to Original Dataset**, and a built-in **10-Step End-to-End Verification Suite**.

---

## Supported Deterministic Custom Instructions

- `Remove duplicate rows` / `Remove exact duplicate rows`
- `Trim extra spaces` / `Trim leading and trailing whitespace`
- `Convert column names to lowercase`
- `Convert column names to uppercase`
- `Standardize column names` (converts headers to clean `snake_case`)
- `Remove empty rows`
- `Remove empty columns`
- `Replace missing <Column> values with <Value>` (e.g., `Replace missing City values with Unknown`)
- `Remove rows containing missing values` (or `Remove rows with missing <Column>`)
- `Convert <Column> to <number | integer | float | date | boolean | titlecase | uppercase | lowercase | text>`

---

## Running Locally & Deployment

### Local Development
```bash
npm install
npm run dev
```
The application runs on `http://localhost:3000`.

### Production Build & Free Static Deployment
```bash
npm run build
```
Because DataTrustAI performs all data processing locally in the browser, the compiled `dist/` bundle can be deployed at zero cost to any static hosting provider (GitHub Pages, Cloudflare Pages, Vercel Free, Netlify Free) or accessed directly via the Google AI Studio Cloud Run preview URL without enabling paid APIs or cloud billing.
