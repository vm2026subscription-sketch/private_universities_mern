import { useState, useRef, useCallback } from 'react';
import * as XLSX from 'xlsx';
import {
  UploadCloud,
  FileSpreadsheet,
  X,
  Eye,
  AlertCircle,
  CheckCircle2,
  Download,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

// ─── Preview pagination ──────────────────────────────────────────────────────
const PAGE_SIZE = 10;

export default function ExcelImportDropzone({
  onParsed,          // (rows: object[], headers: string[]) => void
  expectedHeaders,   // string[]  – used only for hint display
  onDownloadTemplate, // () => void – optional template download callback
  label = 'Drop your Excel or CSV file here',
  hint = 'Supports .xlsx, .xls, .csv',
}) {
  const [dragging, setDragging] = useState(false);
  const [file, setFile] = useState(null);
  const [headers, setHeaders] = useState([]);
  const [rows, setRows] = useState([]);
  const [error, setError] = useState('');
  const [page, setPage] = useState(0);
  const inputRef = useRef(null);

  const parse = useCallback((selectedFile) => {
    setError('');
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const json = XLSX.utils.sheet_to_json(sheet, { defval: '' });
        if (!json.length) {
          setError('The file appears to be empty. Please check the sheet has data rows.');
          return;
        }
        const parsedHeaders = Object.keys(json[0]);
        setHeaders(parsedHeaders);
        setRows(json);
        setPage(0);
        onParsed?.(json, parsedHeaders);
      } catch (err) {
        setError('Failed to parse file: ' + err.message);
      }
    };
    reader.readAsArrayBuffer(selectedFile);
  }, [onParsed]);

  const handleFile = useCallback((selectedFile) => {
    if (!selectedFile) return;
    const ext = selectedFile.name.split('.').pop()?.toLowerCase();
    if (!['xlsx', 'xls', 'csv'].includes(ext)) {
      setError('Unsupported file type. Please upload an .xlsx, .xls, or .csv file.');
      return;
    }
    setFile(selectedFile);
    parse(selectedFile);
  }, [parse]);

  const onDrop = useCallback((e) => {
    e.preventDefault();
    setDragging(false);
    handleFile(e.dataTransfer.files[0]);
  }, [handleFile]);

  const onDragOver = (e) => { e.preventDefault(); setDragging(true); };
  const onDragLeave = () => setDragging(false);

  const clearFile = () => {
    setFile(null);
    setHeaders([]);
    setRows([]);
    setError('');
    setPage(0);
    onParsed?.([], []);
    if (inputRef.current) inputRef.current.value = '';
  };

  const totalPages = Math.ceil(rows.length / PAGE_SIZE);
  const visibleRows = rows.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  return (
    <div className="space-y-4">
      {/* Drop zone */}
      {!file && (
        <div
          onDrop={onDrop}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onClick={() => inputRef.current?.click()}
          className={`relative flex flex-col items-center justify-center gap-4 rounded-3xl border-2 border-dashed p-10 cursor-pointer transition-all select-none
            ${dragging
              ? 'border-primary bg-primary/10 scale-[1.01]'
              : 'border-light-border dark:border-dark-border bg-light-card/40 dark:bg-dark-card/40 hover:border-primary/60 hover:bg-primary/5'
            }`}
        >
          <input
            ref={inputRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            className="hidden"
            onChange={(e) => handleFile(e.target.files[0])}
          />
          <div className={`rounded-2xl p-4 transition-colors ${dragging ? 'bg-primary/20' : 'bg-primary/10'}`}>
            <UploadCloud className={`w-10 h-10 transition-colors ${dragging ? 'text-link scale-110' : 'text-link/70'}`} />
          </div>
          <div className="text-center space-y-1">
            <p className="font-bold text-light-text dark:text-dark-text">{label}</p>
            <p className="text-sm text-light-muted dark:text-dark-muted">{hint}</p>
            <p className="text-xs text-link font-semibold mt-2">Click to browse or drag &amp; drop</p>
          </div>

          {onDownloadTemplate && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onDownloadTemplate(); }}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-link hover:underline mt-1"
            >
              <Download className="w-3.5 h-3.5" />
              Download sample template
            </button>
          )}

          {expectedHeaders?.length > 0 && (
            <div className="max-w-lg text-center">
              <p className="text-xs text-light-muted dark:text-dark-muted">
                <span className="font-semibold">Expected columns: </span>
                {expectedHeaders.join(', ')}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="flex items-start gap-3 rounded-2xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-4">
          <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-red-700 dark:text-red-400">Parse Error</p>
            <p className="text-xs text-red-600 dark:text-red-400 mt-0.5">{error}</p>
          </div>
          <button type="button" onClick={clearFile} className="text-red-400 hover:text-red-600">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* File info + preview */}
      {file && rows.length > 0 && (
        <div className="space-y-4">
          {/* File chip */}
          <div className="flex items-center justify-between gap-3 rounded-2xl bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 px-4 py-3">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-green-100 dark:bg-green-900/40 p-2">
                <FileSpreadsheet className="w-5 h-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-sm font-semibold text-green-800 dark:text-green-300">{file.name}</p>
                <p className="text-xs text-green-600 dark:text-green-400">
                  {rows.length.toLocaleString()} rows · {headers.length} columns · {(file.size / 1024).toFixed(1)} KB
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-green-500" />
              <button
                type="button"
                onClick={clearFile}
                className="rounded-lg p-1 hover:bg-green-100 dark:hover:bg-green-900/40 text-green-600 dark:text-green-400 transition-colors"
                title="Remove file"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Preview table */}
          <div className="rounded-2xl border border-light-border dark:border-dark-border overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 bg-light-card/60 dark:bg-dark-card/60 border-b border-light-border dark:border-dark-border">
              <div className="flex items-center gap-2">
                <Eye className="w-4 h-4 text-light-muted" />
                <span className="text-xs font-bold uppercase tracking-wider text-light-muted dark:text-dark-muted">
                  Data Preview
                </span>
                <span className="badge badge-blue text-xs">{rows.length} rows</span>
              </div>
              {totalPages > 1 && (
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    disabled={page === 0}
                    onClick={() => setPage((p) => p - 1)}
                    className="p-1 rounded-lg hover:bg-light-card dark:hover:bg-dark-card disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="text-xs text-light-muted px-2">
                    {page + 1} / {totalPages}
                  </span>
                  <button
                    type="button"
                    disabled={page >= totalPages - 1}
                    onClick={() => setPage((p) => p + 1)}
                    className="p-1 rounded-lg hover:bg-light-card dark:hover:bg-dark-card disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
            <div className="overflow-x-auto max-h-72">
              <table className="w-full text-xs">
                <thead className="sticky top-0 bg-light-card dark:bg-dark-card">
                  <tr>
                    <th className="px-3 py-2 text-left font-bold uppercase tracking-wider text-light-muted dark:text-dark-muted border-b border-light-border dark:border-dark-border w-10">
                      #
                    </th>
                    {headers.map((h) => (
                      <th
                        key={h}
                        className="px-3 py-2 text-left font-bold uppercase tracking-wider text-light-muted dark:text-dark-muted border-b border-light-border dark:border-dark-border whitespace-nowrap"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {visibleRows.map((row, idx) => (
                    <tr
                      key={idx}
                      className="border-b border-light-border/50 dark:border-dark-border/50 hover:bg-light-card/40 dark:hover:bg-dark-card/40 transition-colors"
                    >
                      <td className="px-3 py-2 text-light-muted font-mono">
                        {page * PAGE_SIZE + idx + 1}
                      </td>
                      {headers.map((h) => (
                        <td
                          key={h}
                          className="px-3 py-2 text-light-text dark:text-dark-text max-w-[200px] truncate"
                          title={String(row[h] ?? '')}
                        >
                          {String(row[h] ?? '') || (
                            <span className="text-light-muted/50 italic">—</span>
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
