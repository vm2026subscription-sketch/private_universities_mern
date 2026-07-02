import { useState, useCallback } from 'react';
import * as XLSX from 'xlsx';
import {
  FileSpreadsheet,
  Building2,
  BookOpen,
  Upload,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RefreshCw,
  Download,
  Info,
  ChevronDown,
  ChevronUp,
  Loader2,
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../utils/api';
import ExcelImportDropzone from './components/ExcelImportDropzone';

// ─── Column mapping config ───────────────────────────────────────────────────

const UNIVERSITY_COLUMN_MAP = {
  'Name':                  'name',
  'University Code':       'universityCode',
  'State':                 'state',
  'City':                  'city',
  'Type':                  'institutionKind',   // private | deemed
  'Segment':               'segment',            // normal | foreign | twinning
  'Status':                'status',             // published | draft
  'Established Year':      'establishedYear',
  'NAAC Grade':            'naacGrade',
  'NIRF Rank':             'nirfRank',
  'Description':           'description',
  'Website':               'website',
  'Logo URL':              'logoUrl',
  'Banner URL':            'bannerImageUrl',
  'Phone':                 'phone',
  'Email':                 'email',
  'Address':               'address',
  'UGC':                   'ugc',
  'AICTE':                 'aicte',
  'NMC':                   'nmc',
  'BCI':                   'bci',
  'COA':                   'coa',
  'PCI':                   'pci',
  'Total Students':        'totalStudents',
  'Campus Acres':          'campusSizeAcres',
  'Avg Package LPA':       'avgPackageLPA',
  'Highest Package LPA':   'highestPackageLPA',
  'Placement %':           'placementPercentage',
  'Highlights':            'highlights',
  'Facilities':            'facilities',
  'Top Recruiters':        'topRecruiters',
  'Admission Link':        'admissionLink',
  'Brochure Link':         'brochureLink',
};

const COURSE_COLUMN_MAP = {
  'University Name':   'universityName',
  'Stream':            'stream',
  'Level':             'category',
  'Base Course':       'baseCourse',
  'Specialization':    'specializationName',
  'Duration (Years)':  'duration',
  'Total Seats':       'totalSeats',
  'Fees Per Year':     'feesPerYear',
  'Eligibility':       'eligibility',
  'Entrance Exams':    'entranceExamsText',
};

const APPROVAL_KEYS = ['ugc', 'aicte', 'nmc', 'bci', 'coa', 'pci'];
const parseBool = (v) => {
  const s = String(v ?? '').trim().toLowerCase();
  return ['true', 'yes', '1', 'y'].includes(s);
};

function mapUniversityRow(row) {
  const mapped = {};
  for (const [excelCol, fieldKey] of Object.entries(UNIVERSITY_COLUMN_MAP)) {
    const val = row[excelCol];
    if (val !== undefined && val !== '') mapped[fieldKey] = val;
  }

  // Build nested approvals
  const approvals = {};
  for (const key of APPROVAL_KEYS) {
    if (mapped[key] !== undefined) {
      approvals[key] = parseBool(mapped[key]);
      delete mapped[key];
    }
  }
  if (Object.keys(approvals).length) mapped.approvals = approvals;

  // Build nested stats
  const STAT_KEYS = ['totalStudents', 'campusSizeAcres', 'avgPackageLPA', 'highestPackageLPA', 'placementPercentage'];
  const stats = {};
  for (const key of STAT_KEYS) {
    if (mapped[key] !== undefined) {
      stats[key] = mapped[key];
      delete mapped[key];
    }
  }
  if (Object.keys(stats).length) mapped.stats = stats;

  // Build nested links
  const LINK_KEYS = ['admissionLink', 'brochureLink'];
  const links = {};
  for (const key of LINK_KEYS) {
    if (mapped[key] !== undefined) {
      links[key] = mapped[key];
      delete mapped[key];
    }
  }
  if (Object.keys(links).length) mapped.links = links;

  return mapped;
}

function mapCourseRow(row) {
  const mapped = {};
  for (const [excelCol, fieldKey] of Object.entries(COURSE_COLUMN_MAP)) {
    const val = row[excelCol];
    if (val !== undefined && val !== '') mapped[fieldKey] = val;
  }
  return mapped;
}

// ─── Template generators ─────────────────────────────────────────────────────

function downloadTemplate(type) {
  let headers, sampleRow;

  if (type === 'universities') {
    headers = Object.keys(UNIVERSITY_COLUMN_MAP);
    sampleRow = {
      'Name': 'Sample University',
      'University Code': 'SAMP_MH',
      'State': 'Maharashtra',
      'City': 'Pune',
      'Type': 'private',
      'Segment': 'normal',
      'Status': 'published',
      'Established Year': 2005,
      'NAAC Grade': 'A+',
      'NIRF Rank': 50,
      'Description': 'A leading university...',
      'Website': 'https://sample.edu',
      'Logo URL': '',
      'Banner URL': '',
      'Phone': '02012345678',
      'Email': 'info@sample.edu',
      'Address': '123 University Road, Pune',
      'UGC': 'yes',
      'AICTE': 'yes',
      'NMC': 'no',
      'BCI': 'no',
      'COA': 'no',
      'PCI': 'no',
      'Total Students': 8000,
      'Campus Acres': 50,
      'Avg Package LPA': 5.5,
      'Highest Package LPA': 18,
      'Placement %': 85,
      'Highlights': 'NAAC A+ Accredited | 500+ Placements',
      'Facilities': 'Hostel | Library | Labs',
      'Top Recruiters': 'TCS | Infosys | Wipro',
      'Admission Link': '',
      'Brochure Link': '',
    };
  } else {
    headers = Object.keys(COURSE_COLUMN_MAP);
    sampleRow = {
      'University Name': 'Sample University',
      'Stream': 'Engineering',
      'Level': 'UG',
      'Base Course': 'B.Tech',
      'Specialization': 'Computer Science',
      'Duration (Years)': 4,
      'Total Seats': 120,
      'Fees Per Year': 75000,
      'Eligibility': '10+2 with PCM',
      'Entrance Exams': 'JEE Main, MHT-CET',
    };
  }

  const ws = XLSX.utils.json_to_sheet([sampleRow], { header: headers });
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Template');
  XLSX.writeFile(wb, `${type}_import_template.xlsx`);
  toast.success('Template downloaded!');
}

// ─── Result row component ─────────────────────────────────────────────────────

function ResultRow({ result, index }) {
  const [open, setOpen] = useState(false);
  const isError = Boolean(result.error);

  return (
    <div className={`rounded-xl border text-xs transition-colors ${
      isError
        ? 'border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20'
        : 'border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20'
    }`}>
      <div
        className="flex items-center justify-between gap-3 px-4 py-2.5 cursor-pointer"
        onClick={() => isError && setOpen((v) => !v)}
      >
        <div className="flex items-center gap-2">
          {isError
            ? <XCircle className="w-4 h-4 text-red-500 shrink-0" />
            : <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />}
          <span className={`font-semibold ${isError ? 'text-red-700 dark:text-red-300' : 'text-green-700 dark:text-green-300'}`}>
            Row {index + 1}
          </span>
          {!isError && result.name && (
            <span className="text-green-600 dark:text-green-400 truncate max-w-[300px]">— {result.name}</span>
          )}
          {isError && (
            <span className="text-red-600 dark:text-red-400 truncate max-w-[300px]">{result.error}</span>
          )}
        </div>
        {isError && (
          <div className="shrink-0">
            {open ? <ChevronUp className="w-3.5 h-3.5 text-red-400" /> : <ChevronDown className="w-3.5 h-3.5 text-red-400" />}
          </div>
        )}
      </div>
      {isError && open && result.item && (
        <div className="px-4 pb-3">
          <pre className="text-[10px] text-red-600 dark:text-red-400 bg-red-100/60 dark:bg-red-900/30 rounded-lg p-2 overflow-x-auto whitespace-pre-wrap">
            {JSON.stringify(result.item, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}

// ─── Import type config ──────────────────────────────────────────────────────

const IMPORT_TYPES = [
  {
    id: 'universities',
    label: 'Universities',
    icon: Building2,
    color: 'orange',
    description: 'Bulk upload university records including approvals, stats, and links.',
    endpoint: '/admin/import/universities',
    expectedHeaders: Object.keys(UNIVERSITY_COLUMN_MAP),
    mapper: mapUniversityRow,
    payloadKey: 'universities',
  },
  {
    id: 'courses',
    label: 'Courses',
    icon: BookOpen,
    color: 'blue',
    description: 'Bulk upload courses linked to existing universities by name.',
    endpoint: '/admin/import/courses',
    expectedHeaders: Object.keys(COURSE_COLUMN_MAP),
    mapper: mapCourseRow,
    payloadKey: 'courses',
  },
];

// ─── Main component ──────────────────────────────────────────────────────────

export default function DataImportManager() {
  const [activeType, setActiveType] = useState('universities');
  const [parsedRows, setParsedRows] = useState([]);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState(null); // { succeeded, failed, errors, message }

  const config = IMPORT_TYPES.find((t) => t.id === activeType);

  const handleParsed = useCallback((rows) => {
    setParsedRows(rows);
    setImportResult(null);
  }, []);

  const handleSwitchType = (typeId) => {
    setActiveType(typeId);
    setParsedRows([]);
    setImportResult(null);
  };

  const handleImport = async () => {
    if (!parsedRows.length) {
      toast.error('Please upload a file first.');
      return;
    }

    setImporting(true);
    setImportResult(null);

    try {
      const mapped = parsedRows.map(config.mapper).filter(Boolean);
      const response = await api.post(config.endpoint, mapped);
      const data = response.data;

      setImportResult({
        succeeded: data.succeededCount || 0,
        failed: data.failedCount || 0,
        errors: (data.errors || []).map((e, i) => ({
          index: i,
          error: e.error,
          item: e.item,
          name: e.item?.name || e.item?.universityName || e.item?.baseCourse || '',
        })),
        message: data.message || 'Import complete',
      });

      if (data.succeededCount > 0) {
        toast.success(`${data.succeededCount} record(s) imported successfully!`);
      }
      if (data.failedCount > 0) {
        toast.error(`${data.failedCount} row(s) failed. See details below.`);
      }
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Import failed';
      toast.error(msg);
      setImportResult({ error: msg });
    } finally {
      setImporting(false);
    }
  };

  const resetAll = () => {
    setParsedRows([]);
    setImportResult(null);
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-light-text dark:text-dark-text">Data Import</h2>
        <p className="mt-1 text-sm text-light-muted dark:text-dark-muted">
          Upload Excel or CSV files to bulk import university and course data. Download a template to get started.
        </p>
      </div>

      {/* Type selector cards */}
      <div className="grid gap-4 sm:grid-cols-2">
        {IMPORT_TYPES.map((type) => {
          const Icon = type.icon;
          const active = activeType === type.id;
          return (
            <button
              key={type.id}
              type="button"
              onClick={() => handleSwitchType(type.id)}
              className={`text-left p-5 rounded-2xl border-2 transition-all space-y-2 ${
                active
                  ? 'border-primary bg-primary/5 shadow-sm'
                  : 'border-light-border dark:border-dark-border hover:border-primary/40 bg-white dark:bg-dark-card'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`rounded-xl p-2.5 ${active ? 'bg-primary text-white' : 'bg-primary/10 text-link'}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <div>
                  <p className={`font-bold text-sm ${active ? 'text-link' : 'text-light-text dark:text-dark-text'}`}>
                    Import {type.label}
                  </p>
                  {active && <p className="text-xs text-link/80 font-medium">Active</p>}
                </div>
              </div>
              <p className="text-xs text-light-muted dark:text-dark-muted leading-relaxed">
                {type.description}
              </p>
            </button>
          );
        })}
      </div>

      {/* How-to info banner */}
      <div className="flex items-start gap-3 rounded-2xl bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 p-4">
        <Info className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
        <div className="space-y-1 text-sm text-blue-700 dark:text-blue-300">
          <p className="font-semibold">How bulk import works</p>
          <ol className="list-decimal list-inside space-y-0.5 text-xs text-blue-600 dark:text-blue-400">
            <li>Download the sample template for the correct column format.</li>
            <li>Fill in your data — leave optional columns blank if unknown.</li>
            <li>Save as <strong>.xlsx</strong> or <strong>.csv</strong> and drag it into the drop zone below.</li>
            <li>Review the preview table, then click <strong>Start Import</strong>.</li>
            <li>Existing records matched by name or code will be <strong>updated</strong>; new ones will be <strong>created</strong>.</li>
          </ol>
        </div>
      </div>

      {/* Main import card */}
      <div className="card p-6 md:p-8 space-y-6 shadow-xl">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-light-text dark:text-dark-text">
              Import {config.label}
            </h3>
            <p className="text-xs text-light-muted dark:text-dark-muted mt-0.5">
              {parsedRows.length > 0
                ? `${parsedRows.length} rows ready to import`
                : 'Upload a spreadsheet to continue'}
            </p>
          </div>
          <button
            type="button"
            onClick={() => downloadTemplate(activeType)}
            className="btn-outline text-xs flex items-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5" />
            Template
          </button>
        </div>

        <ExcelImportDropzone
          key={activeType}                      // remount on type switch to clear state
          onParsed={handleParsed}
          expectedHeaders={config.expectedHeaders}
          onDownloadTemplate={() => downloadTemplate(activeType)}
          label={`Drop your ${config.label} spreadsheet here`}
        />

        {/* Action bar */}
        {parsedRows.length > 0 && !importResult && (
          <div className="flex items-center justify-between gap-4 pt-2">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              <p className="text-xs text-light-muted dark:text-dark-muted">
                Review the preview above before importing. This action will <strong>upsert</strong> records.
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button type="button" onClick={resetAll} className="btn-outline text-sm flex items-center gap-1.5">
                <RefreshCw className="w-4 h-4" />
                Clear
              </button>
              <button
                type="button"
                onClick={handleImport}
                disabled={importing}
                className="btn-primary text-sm flex items-center gap-1.5 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {importing ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Upload className="w-4 h-4" />
                )}
                {importing ? 'Importing...' : `Start Import (${parsedRows.length} rows)`}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Results */}
      {importResult && (
        <div className="card p-6 md:p-8 space-y-5 shadow-xl">
          {/* Summary */}
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-light-text dark:text-dark-text">Import Results</h3>
            <button type="button" onClick={resetAll} className="btn-outline text-xs flex items-center gap-1.5">
              <RefreshCw className="w-3.5 h-3.5" />
              Import Again
            </button>
          </div>

          {importResult.error ? (
            <div className="flex items-start gap-3 rounded-2xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-4">
              <XCircle className="w-5 h-5 text-red-500 shrink-0" />
              <p className="text-sm text-red-700 dark:text-red-300 font-medium">{importResult.error}</p>
            </div>
          ) : (
            <>
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="rounded-2xl bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 p-4 text-center">
                  <p className="text-3xl font-bold text-green-600 dark:text-green-400">{importResult.succeeded}</p>
                  <p className="text-xs font-semibold text-green-700 dark:text-green-300 mt-1">Succeeded</p>
                </div>
                <div className={`rounded-2xl border p-4 text-center ${
                  importResult.failed > 0
                    ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
                    : 'bg-light-card dark:bg-dark-card border-light-border dark:border-dark-border'
                }`}>
                  <p className={`text-3xl font-bold ${importResult.failed > 0 ? 'text-red-600 dark:text-red-400' : 'text-light-muted'}`}>
                    {importResult.failed}
                  </p>
                  <p className={`text-xs font-semibold mt-1 ${importResult.failed > 0 ? 'text-red-700 dark:text-red-300' : 'text-light-muted'}`}>
                    Failed
                  </p>
                </div>
                <div className="rounded-2xl bg-light-card dark:bg-dark-card border border-light-border dark:border-dark-border p-4 text-center">
                  <p className="text-3xl font-bold text-light-text dark:text-dark-text">
                    {(importResult.succeeded || 0) + (importResult.failed || 0)}
                  </p>
                  <p className="text-xs font-semibold text-light-muted mt-1">Total Processed</p>
                </div>
              </div>

              {importResult.errors?.length > 0 && (
                <div className="space-y-3">
                  <p className="text-sm font-bold uppercase tracking-wider text-red-600 dark:text-red-400">
                    Failed Rows ({importResult.errors.length})
                  </p>
                  <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                    {importResult.errors.map((result, idx) => (
                      <ResultRow key={idx} result={result} index={result.index ?? idx} />
                    ))}
                  </div>
                </div>
              )}

              {importResult.succeeded > 0 && importResult.failed === 0 && (
                <div className="flex items-center gap-3 rounded-2xl bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 p-4">
                  <CheckCircle2 className="w-6 h-6 text-green-500 shrink-0" />
                  <p className="text-sm font-semibold text-green-700 dark:text-green-300">
                    All {importResult.succeeded} records imported successfully! Head to the{' '}
                    {activeType === 'universities' ? 'Universities' : 'Courses'} manager to review them.
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Column reference */}
      <details className="card p-5 group shadow">
        <summary className="flex items-center justify-between cursor-pointer list-none">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="w-4 h-4 text-link" />
            <span className="text-sm font-bold text-light-text dark:text-dark-text">
              Column Reference — {config.label}
            </span>
            <span className="badge badge-blue text-xs">{config.expectedHeaders.length} columns</span>
          </div>
          <ChevronDown className="w-4 h-4 text-light-muted group-open:rotate-180 transition-transform" />
        </summary>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-light-border dark:border-dark-border">
                <th className="text-left py-2 pr-4 font-bold uppercase tracking-wider text-light-muted w-1/2">Excel Column Header</th>
                <th className="text-left py-2 font-bold uppercase tracking-wider text-light-muted">Maps to DB Field</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-light-border/40 dark:divide-dark-border/40">
              {Object.entries(activeType === 'universities' ? UNIVERSITY_COLUMN_MAP : COURSE_COLUMN_MAP).map(
                ([col, field]) => (
                  <tr key={col} className="hover:bg-light-card/50 dark:hover:bg-dark-card/50 transition-colors">
                    <td className="py-2 pr-4 font-mono text-link font-semibold">{col}</td>
                    <td className="py-2 text-light-muted dark:text-dark-muted font-mono">{field}</td>
                  </tr>
                )
              )}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  );
}
