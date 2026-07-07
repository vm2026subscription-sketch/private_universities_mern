import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { CheckCircle2, XCircle, AlertTriangle, RefreshCw, FileText, FileSpreadsheet, Check } from 'lucide-react';
import axios from 'axios';
import api from '../../utils/api';  

const ExcelUploader = ({ onUploadComplete, type = 'universities' }) => {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [step, setStep] = useState('upload'); // upload, preview, confirm
  const [previewData, setPreviewData] = useState(null);
  const [uploadMode, setUploadMode] = useState('upsert');
  const [progress, setProgress] = useState(0);
  const [useBulkMode, setUseBulkMode] = useState(true); // NEW: Use bulk upload (both sheets)
  const [sheetNames, setSheetNames] = useState([]);
  const [selectedSheet, setSelectedSheet] = useState('');

  const onDrop = useCallback((acceptedFiles) => {
    const uploadedFile = acceptedFiles[0];
    if (uploadedFile) {
      setFile(uploadedFile);
      if (useBulkMode) {
        // For bulk mode, directly proceed to bulk upload
        handleBulkUpload(uploadedFile);
      } else {
        // For single sheet mode, get sheet names first
        getSheetNames(uploadedFile);
      }
    }
  }, [useBulkMode]);

  const getSheetNames = async (fileToCheck) => {
    setUploading(true);
    const formData = new FormData();
    formData.append('file', fileToCheck);

    try {
      const response = await api.post('/admin/upload/sheets', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setSheetNames(response.data.sheets);
      
      // Auto-select first valid sheet
      const firstSheet = response.data.sheets[0] || '';
      setSelectedSheet(firstSheet);
      handlePreview(fileToCheck, firstSheet);
    } catch (error) {
      alert(`Failed to read Excel file: ${error.response?.data?.error || error.message}`);
      setUploading(false);
    }
  };

  const handlePreview = async (fileToPreview, sheetName = selectedSheet) => {
    setUploading(true);
    const formData = new FormData();
    formData.append('file', fileToPreview);
    formData.append('sheetName', sheetName);
    formData.append('uploadType', type);

    try {
      const response = await api.post('/admin/upload/preview', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        // Excel imports do heavy DB work (dedup + upserts + course linking) and
        // run on a slow/cold free-tier backend — allow up to 15 min, not the
        // global 30s default, so large sheets don't get cancelled mid-import.
        timeout: 900000,
        onUploadProgress: (progressEvent) => {
          setProgress(Math.round((progressEvent.loaded * 100) / progressEvent.total));
        }
      });

      setPreviewData(response.data);
      setStep('preview');
    } catch (error) {
      alert(`Preview failed: ${error.response?.data?.error || error.message}`);
    } finally {
      setUploading(false);
      setProgress(0);
    }
  };

  const handleConfirm = async () => {
    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('mode', uploadMode);
    formData.append('validateOnly', 'false');
    formData.append('sheetName', selectedSheet);
    formData.append('uploadType', type);

    try {
      const response = await api.post('/admin/upload/confirm', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        // Excel imports do heavy DB work (dedup + upserts + course linking) and
        // run on a slow/cold free-tier backend — allow up to 15 min, not the
        // global 30s default, so large sheets don't get cancelled mid-import.
        timeout: 900000,
        onUploadProgress: (progressEvent) => {
          setProgress(Math.round((progressEvent.loaded * 100) / progressEvent.total));
        }
      });

      if (onUploadComplete) onUploadComplete(response.data);
      setStep('complete');
    } catch (error) {
      alert(`Upload failed: ${error.response?.data?.error || error.message}`);
    } finally {
      setUploading(false);
      setProgress(0);
    }
  };

  // NEW: Handle bulk upload (both sheets together)
  const handleBulkUpload = async (fileToUpload) => {
    setUploading(true);
    const formData = new FormData();
    formData.append('file', fileToUpload);
    formData.append('mode', uploadMode);

    try {
      const response = await api.post('/admin/upload/bulk', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        // Excel imports do heavy DB work (dedup + upserts + course linking) and
        // run on a slow/cold free-tier backend — allow up to 15 min, not the
        // global 30s default, so large sheets don't get cancelled mid-import.
        timeout: 900000,
        onUploadProgress: (progressEvent) => {
          setProgress(Math.round((progressEvent.loaded * 100) / progressEvent.total));
        }
      });

      // Set preview data from bulk response
      setPreviewData({
        sheetType: 'bulk',
        totalRows: (response.data.results?.universities?.created || 0) + (response.data.results?.courses?.created || 0),
        validCount: (response.data.results?.universities?.created || 0) + (response.data.results?.courses?.created || 0),
        invalidCount: (response.data.results?.universities?.skipped || 0) + (response.data.results?.courses?.skipped || 0),
        errors: [...(response.data.results?.universities?.errors || []), ...(response.data.results?.courses?.errors || [])],
        warnings: [],
        preview: [],
        bulkResults: response.data.results
      });
      
      setStep('preview');
    } catch (error) {
      alert(`Bulk upload failed: ${error.response?.data?.error || error.message}`);
    } finally {
      setUploading(false);
      setProgress(0);
    }
  };

  const reset = () => {
    setFile(null);
    setPreviewData(null);
    setStep('upload');
    setUploadMode('upsert');
    setSheetNames([]);
    setSelectedSheet('');
  };

  const ValidationSummary = () => {
    if (!previewData) return null;
    
    // Check if this is bulk upload results
    if (previewData.bulkResults) {
      const { universities, courses } = previewData.bulkResults;
      return (
        <div className="mb-6 space-y-4">
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <h4 className="flex items-center gap-1.5 font-semibold text-green-800 mb-2"><CheckCircle2 className="w-4 h-4" aria-hidden="true" /> Bulk Upload Complete!</h4>
            <div className="grid grid-cols-2 gap-4 mt-2">
              <div>
                <p className="font-medium text-gray-700">Universities:</p>
                <ul className="text-sm mt-1 space-y-1">
                  <li className="flex items-center gap-1.5 text-green-600"><Check className="w-3.5 h-3.5" aria-hidden="true" /> Created: {universities.created}</li>
                  <li className="flex items-center gap-1.5 text-blue-600"><Check className="w-3.5 h-3.5" aria-hidden="true" /> Updated: {universities.updated}</li>
                  <li className="flex items-center gap-1.5 text-yellow-600"><AlertTriangle className="w-3.5 h-3.5" aria-hidden="true" /> Skipped: {universities.skipped}</li>
                </ul>
              </div>
              <div>
                <p className="font-medium text-gray-700">Courses:</p>
                <ul className="text-sm mt-1 space-y-1">
                  <li className="flex items-center gap-1.5 text-green-600"><Check className="w-3.5 h-3.5" aria-hidden="true" /> Created: {courses.created}</li>
                  <li className="flex items-center gap-1.5 text-blue-600"><Check className="w-3.5 h-3.5" aria-hidden="true" /> Updated: {courses.updated}</li>
                  <li className="flex items-center gap-1.5 text-yellow-600"><AlertTriangle className="w-3.5 h-3.5" aria-hidden="true" /> Skipped: {courses.skipped}</li>
                </ul>
              </div>
            </div>
          </div>
          
          {previewData.errors && previewData.errors.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <h4 className="font-semibold text-red-800 mb-2">Errors ({previewData.errors.length})</h4>
              <ul className="list-disc list-inside space-y-1 max-h-40 overflow-auto">
                {previewData.errors.slice(0, 10).map((err, i) => (
                  <li key={i} className="text-sm text-red-700">{err.error || err}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      );
    }
    
    // Regular single sheet preview
    const { validCount, invalidCount, errors, warnings, totalRows } = previewData;

    return (
      <div className="mb-6 space-y-4">
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-blue-50 p-4 rounded-lg">
            <div className="text-2xl font-bold text-blue-600">{totalRows}</div>
            <div className="text-sm text-gray-600">Total Rows</div>
          </div>
          <div className="bg-green-50 p-4 rounded-lg">
            <div className="text-2xl font-bold text-green-600">{validCount}</div>
            <div className="text-sm text-gray-600">Valid Rows</div>
          </div>
          <div className="bg-red-50 p-4 rounded-lg">
            <div className="text-2xl font-bold text-red-600">{invalidCount}</div>
            <div className="text-sm text-gray-600">Invalid Rows</div>
          </div>
        </div>

        {errors && errors.length > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <h4 className="font-semibold text-red-800 mb-2">Errors ({errors.length})</h4>
            <ul className="list-disc list-inside space-y-1 max-h-40 overflow-auto">
              {errors.slice(0, 10).map((err, i) => (
                <li key={i} className="text-sm text-red-700">{err}</li>
              ))}
              {errors.length > 10 && (
                <li className="text-sm text-red-700">...and {errors.length - 10} more</li>
              )}
            </ul>
          </div>
        )}

        {warnings && warnings.length > 0 && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <h4 className="font-semibold text-yellow-800 mb-2">Warnings ({warnings.length})</h4>
            <ul className="list-disc list-inside space-y-1 max-h-40 overflow-auto">
              {warnings.slice(0, 10).map((warn, i) => (
                <li key={i} className="text-sm text-yellow-700">{warn}</li>
              ))}
            </ul>
          </div>
        )}

        {previewData.preview && previewData.preview.length > 0 && (
          <div className="bg-white border rounded-lg overflow-hidden">
            <h4 className="font-semibold p-3 bg-gray-50 border-b">Preview (First 5 rows)</h4>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-2 text-left">Status</th>
                    {Object.keys(previewData.preview[0] || {})
                      .filter(k => !k.startsWith('_'))
                      .slice(0, 6)
                      .map(key => (
                        <th key={key} className="px-3 py-2 text-left">{key}</th>
                      ))}
                  </tr>
                </thead>
                <tbody>
                  {previewData.preview.slice(0, 5).map((row, i) => (
                    <tr key={i} className={row._validation?.isValid ? '' : 'bg-red-50'}>
                      <td className="px-3 py-2">
                        {row._validation?.isValid
                          ? <CheckCircle2 className="w-4 h-4 text-green-600" aria-label="Valid row" />
                          : <XCircle className="w-4 h-4 text-red-600" aria-label="Invalid row" />}
                      </td>
                      {Object.entries(row)
                        .filter(([k]) => !k.startsWith('_'))
                        .slice(0, 6)
                        .map(([key, val]) => (
                          <td key={key} className="px-3 py-2 truncate max-w-xs">
                            {typeof val === 'object' ? JSON.stringify(val).slice(0, 50) : String(val || '').slice(0, 50)}
                          </td>
                        ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    );
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls'],
      'text/csv': ['.csv']
    },
    maxSize: 10485760 // 10MB
  });

  if (step === 'complete') {
    return (
      <div className="bg-white rounded-lg shadow p-8 text-center">
        <CheckCircle2 className="w-16 h-16 mx-auto mb-4 text-green-500" aria-hidden="true" />
        <h3 className="text-xl font-semibold mb-2">Upload Complete!</h3>
        <p className="text-gray-600 mb-4">Your data has been successfully imported.</p>
        <button onClick={reset} className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
          Upload Another File
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="p-6 border-b">
        <h2 className="text-xl font-semibold">
          Upload {type === 'universities' ? 'Universities' : 'Courses'} Data
        </h2>
        <p className="text-gray-600 text-sm mt-1">
          Upload Excel files with messy data — auto-detects headers and cleans values
        </p>
      </div>

      <div className="p-6">
        {/* NEW: Bulk Mode Toggle */}
        <div className="mb-6">
          <label className="block text-sm font-medium mb-2">Upload Mode</label>
          <div className="flex gap-4">
            <button
              type="button"
              onClick={() => {
                setUseBulkMode(true);
                reset();
              }}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                useBulkMode
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              <span className="inline-flex items-center gap-1.5"><RefreshCw className="w-4 h-4" aria-hidden="true" /> Bulk Upload (Both Sheets)</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setUseBulkMode(false);
                reset();
              }}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                !useBulkMode
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              <span className="inline-flex items-center gap-1.5"><FileText className="w-4 h-4" aria-hidden="true" /> Single Sheet Upload</span>
            </button>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            {useBulkMode 
              ? 'Upload one file with both "Universities" and "Courses" sheets - they will be linked automatically'
              : 'Upload a single sheet (Universities OR Courses) from your Excel file'}
          </p>
        </div>

        {step === 'upload' && (
          <>
            <div
              {...getRootProps()}
              className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
                ${isDragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'}`}
            >
              <input {...getInputProps()} />
              <FileSpreadsheet className="w-12 h-12 mx-auto mb-2 text-gray-400" aria-hidden="true" />
              {isDragActive ? (
                <p className="text-blue-600">Drop the Excel file here...</p>
              ) : (
                <>
                  <p className="text-gray-600">Drag & drop an Excel file here, or click to select</p>
                  <p className="text-gray-400 text-sm mt-1">Supports .xlsx, .xls, .csv (max 10MB)</p>
                </>
              )}
            </div>

            {/* Sheet selector - only for single sheet mode */}
            {!useBulkMode && sheetNames.length > 0 && (
              <div className="mt-4">
                <label className="block text-sm font-medium mb-2">Select Sheet</label>
                <select
                  value={selectedSheet}
                  onChange={(e) => {
                    setSelectedSheet(e.target.value);
                    if (file) handlePreview(file, e.target.value);
                  }}
                  className="border rounded-lg px-3 py-2 w-full"
                >
                  {sheetNames.map((sheet, i) => (
                    <option key={i} value={sheet}>
                      {sheet}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </>
        )}

        {step === 'preview' && previewData && (
          <>
            <ValidationSummary />
            
            {/* Only show import mode selector for single sheet mode */}
            {!previewData.bulkResults && (
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">Import Mode</label>
                <select 
                  value={uploadMode} 
                  onChange={(e) => setUploadMode(e.target.value)}
                  className="border rounded-lg px-3 py-2 w-48"
                >
                  <option value="upsert">Update existing / Insert new</option>
                  <option value="insert">Insert only (skip existing)</option>
                </select>
              </div>
            )}

            <div className="flex gap-3">
              {previewData.bulkResults ? (
                <button
                  onClick={() => setStep('complete')}
                  className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700"
                >
                  Continue
                </button>
              ) : (
                <button
                  onClick={handleConfirm}
                  disabled={uploading || previewData.validCount === 0}
                  className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50"
                >
                  {uploading ? `Importing... ${progress}%` : `Import ${previewData.validCount} Valid Rows`}
                </button>
              )}
              <button
                onClick={reset}
                disabled={uploading}
                className="bg-gray-200 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-300"
              >
                Cancel
              </button>
            </div>

            {!previewData.bulkResults && previewData.invalidCount > 0 && (
              <p className="flex items-center gap-1.5 text-sm text-red-600 mt-4">
                <AlertTriangle className="w-4 h-4 shrink-0" aria-hidden="true" /> {previewData.invalidCount} rows have errors and will be skipped. Fix them in Excel and re-upload.
              </p>
            )}
          </>
        )}

        {uploading && step === 'upload' && (
          <div className="mt-4">
            <div className="bg-gray-200 rounded-full h-2">
              <div 
                className="bg-blue-600 rounded-full h-2 transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-center text-sm text-gray-600 mt-2">Processing file... {progress}%</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ExcelUploader;
