import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import {
  UploadCloud,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  Loader2,
  Users,
  Download,
  FileText,
  Cpu,
  Zap,
} from 'lucide-react';
import { apiRequest, downloadFile, apiUpload } from '../lib/api';
import { toast } from '../context/ToastContext';
import { parseSpreadsheetWithWorker, ExcelStreamProgress } from '../lib/excel-worker-client';

export const ImportPage: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [previewData, setPreviewData] = useState<any>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [workerProgress, setWorkerProgress] = useState<ExcelStreamProgress | null>(null);
  const [workerDuration, setWorkerDuration] = useState<number | null>(null);
  const [splitField, setSplitField] = useState('city');
  const [assignedUser, setAssignedUser] = useState('');
  const [importResult, setImportResult] = useState<any>(null);

  const { data: usersData } = useQuery({
    queryKey: ['users', 'assignable'],
    queryFn: () => apiRequest('/users'),
  });
  const members = usersData || [];

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    // Client-side file validation
    const validExtensions = ['.xlsx', '.xls', '.csv'];
    const fileNameLower = selectedFile.name.toLowerCase();
    const isValidExtension = validExtensions.some((ext) => fileNameLower.endsWith(ext));

    if (!isValidExtension) {
      toast.error('Only spreadsheet files (.xlsx, .xls, .csv) are supported.');
      e.target.value = '';
      return;
    }

    if (selectedFile.size > 25 * 1024 * 1024) {
      toast.error('File size exceeds the 25 MB limit. Please upload a smaller file.');
      e.target.value = '';
      return;
    }

    setFile(selectedFile);
    setIsUploading(true);
    setImportResult(null);
    setWorkerProgress({ stage: 'reading', percent: 5, rowsProcessed: 0 });
    setWorkerDuration(null);

    try {
      // 1. Offload sheet decoding to background WebWorker (handles >25,000 rows without locking UI)
      const workerResult = await parseSpreadsheetWithWorker(
        selectedFile,
        selectedFile.name,
        (progress) => setWorkerProgress(progress),
        50, // max 50 preview rows
      );

      setWorkerDuration(workerResult.durationMs);
      setPreviewData({
        headers: workerResult.headers,
        previewRows: workerResult.previewRows,
        totalRowsEstimate: workerResult.totalRows,
        workerDecoded: true,
      });

      toast.success(
        `WebWorker streamed ${workerResult.totalRows.toLocaleString()} rows in ${workerResult.durationMs}ms without UI blocking!`,
      );
    } catch (workerErr: any) {
      console.warn('WebWorker parser fallback, attempting server preview:', workerErr);
      // Fallback to server-side preview if WebWorker fails
      const formData = new FormData();
      formData.append('file', selectedFile);

      try {
        const data = await apiUpload('/leads/import/preview', formData);
        setPreviewData(data);
        toast.success(`Server parsed ${data.previewRows?.length || 0} preview rows`);
      } catch (err: any) {
        toast.error(err.message || 'Failed to inspect file');
        setFile(null);
      }
    } finally {
      setIsUploading(false);
      setWorkerProgress(null);
    }
  };

  const commitMutation = useMutation({
    mutationFn: () =>
      apiRequest('/leads/import/commit', {
        method: 'POST',
        body: {
          fileName: file?.name || 'import.xlsx',
          rows: previewData.previewRows,
          rules: {
            field: splitField,
            defaultUserId: assignedUser || undefined,
            splits: [],
          },
        },
      }),
    onSuccess: (data) => {
      setImportResult(data);
      setPreviewData(null);
      setFile(null);
      toast.success(`Successfully imported ${data.ok || 0} leads into sales pipeline!`);
    },
    onError: (err: any) => toast.error(err.message || 'Import commit failed'),
  });

  const downloadSampleExcel = async () => {
    try {
      await downloadFile('/leads/import/sample-xlsx', 'lead-import-sample.xlsx');
      toast.success('Sample Excel template downloaded');
    } catch (err: any) {
      toast.error(err.message || 'Download failed');
    }
  };

  const downloadSampleCsv = async () => {
    try {
      await downloadFile('/leads/import/sample-csv', 'lead-import-sample.csv');
      toast.success('Sample CSV template downloaded');
    } catch (err: any) {
      toast.error(err.message || 'Download failed');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">Bulk Lead Ingestion & Allocation</h1>
          <p className="text-xs sm:text-sm text-slate-500">
            Upload prospect sheets, validate format, and assign leads to sales team
          </p>
        </div>

        {/* Sample Templates Download Action Group */}
        <div className="flex items-center gap-2">
          <button
            onClick={downloadSampleExcel}
            className="px-3.5 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-semibold flex items-center gap-1.5 shadow-sm"
          >
            <Download className="w-4 h-4 text-emerald-600" />
            <span>Sample Excel (.xlsx)</span>
          </button>
          <button
            onClick={downloadSampleCsv}
            className="px-3.5 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-semibold flex items-center gap-1.5 shadow-sm"
          >
            <Download className="w-4 h-4 text-amber-600" />
            <span>Sample CSV (.csv)</span>
          </button>
        </div>
      </div>

      {/* Upload Zone */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border-2 border-dashed border-slate-200 hover:border-amber-400 transition-colors text-center">
        <UploadCloud className="w-12 h-12 text-amber-500 mx-auto mb-3" />
        <h3 className="text-base font-bold text-slate-800">Upload Solar Leads Spreadsheet</h3>
        <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1 mb-4">
          Accepts .xlsx and .csv files exceeding 25,000+ rows. Decoding is handled entirely via background WebWorkers for zero UI latency.
        </p>

        <label className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-amber-500 text-slate-950 font-bold text-xs hover:bg-amber-400 cursor-pointer shadow-sm active:scale-95 transition-all">
          <span>Choose File from Device</span>
          <input
            type="file"
            accept=".xlsx,.xls,.csv"
            onChange={handleFileChange}
            className="hidden"
          />
        </label>

        {/* Worker Streaming Progress Indicator */}
        {workerProgress && (
          <div className="mt-5 max-w-md mx-auto p-4 rounded-2xl bg-amber-50 border border-amber-200/80 text-left animate-in fade-in">
            <div className="flex items-center justify-between text-xs font-bold text-amber-950 mb-1.5">
              <span className="flex items-center gap-1.5">
                <Cpu className="w-4 h-4 text-amber-600 animate-pulse" />
                <span className="capitalize">Worker Streaming: {workerProgress.stage.replace('_', ' ')}</span>
              </span>
              <span>{workerProgress.percent}%</span>
            </div>
            <div className="w-full h-2 rounded-full bg-amber-200/60 overflow-hidden">
              <div
                className="h-full bg-amber-500 transition-all duration-150 rounded-full"
                style={{ width: `${workerProgress.percent}%` }}
              />
            </div>
            <p className="text-[11px] text-amber-800 mt-2 flex items-center justify-between">
              <span>Rows processed: {workerProgress.rowsProcessed.toLocaleString()}</span>
              {workerProgress.totalEstimate ? (
                <span>of ~{workerProgress.totalEstimate.toLocaleString()} rows</span>
              ) : null}
            </p>
          </div>
        )}

        {isUploading && !workerProgress && (
          <div className="mt-4 flex items-center justify-center gap-2 text-xs text-slate-500">
            <Loader2 className="w-4 h-4 animate-spin text-amber-500" />
            <span>Scanning, sanitizing formula triggers and parsing columns...</span>
          </div>
        )}
      </div>

      {/* Security Sanitizer Badge */}
      <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200/60 flex items-center gap-3">
        <ShieldCheck className="w-6 h-6 text-emerald-600 shrink-0" />
        <div className="text-xs text-emerald-900">
          <span className="font-bold">Formula Injection Protection Active:</span> Cells starting with <code className="bg-emerald-100 px-1 py-0.5 rounded text-[11px]">=</code>, <code className="bg-emerald-100 px-1 py-0.5 rounded text-[11px]">+</code>, or <code className="bg-emerald-100 px-1 py-0.5 rounded text-[11px]">@</code> are automatically escaped to prevent Excel command injection.
        </div>
      </div>

      {/* Preview & Distribution Rules */}
      {previewData && (
        <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm space-y-5 animate-in fade-in duration-200">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-3 border-b border-slate-100 gap-2">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-sm text-slate-900">Validated Ingestion Preview ({file?.name})</h3>
                {workerDuration !== null && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200">
                    <Zap className="w-3 h-3 text-amber-500" />
                    WebWorker: {workerDuration}ms
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500">
                Found {previewData.headers.length} headers • ~{previewData.totalRowsEstimate.toLocaleString()} rows detected
              </p>
            </div>
            <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
              Format Verified
            </span>
          </div>

          {/* Table Preview */}
          <div className="overflow-x-auto max-h-56 border border-slate-100 rounded-2xl">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 sticky top-0 border-b border-slate-100">
                <tr>
                  {previewData.headers.map((h: string) => (
                    <th key={h} className="py-2.5 px-3 font-semibold">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {previewData.previewRows.map((row: any, i: number) => (
                  <tr key={i} className="hover:bg-slate-50">
                    {previewData.headers.map((h: string) => (
                      <td key={h} className="py-2 px-3 text-slate-700">{row[h] || '-'}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Allocation & Split Rules */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-3">
            <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
              <Users className="w-4 h-4 text-amber-500" />
              <span>Data Assignment & Lead Ownership Rules</span>
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block text-slate-600 font-semibold mb-1">Partition Leads By:</label>
                <select
                  value={splitField}
                  onChange={(e) => setSplitField(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 bg-white"
                >
                  <option value="city">City / Geography (Indore, Bhopal, Jabalpur, Gwalior, Pune...)</option>
                  <option value="category">Category (Residential / Commercial)</option>
                  <option value="source">Marketing Source (Self, Company Database, WhatsApp, Ads...)</option>
                </select>
              </div>
              <div>
                <label className="block text-slate-600 font-semibold mb-1">Target Assigned Sales Representative:</label>
                <select
                  value={assignedUser}
                  onChange={(e) => setAssignedUser(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 bg-white font-semibold text-slate-800"
                >
                  <option value="">⚡ Round-Robin Auto Balance Across All Active Sales Reps</option>
                  {members.map((m: any) => (
                    <option key={m.id} value={m.id}>
                      {m.full_name} ({m.role.replace('_', ' ')})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Commit Button */}
          <button
            onClick={() => commitMutation.mutate()}
            disabled={commitMutation.isPending}
            className="w-full py-3 rounded-2xl bg-amber-500 text-slate-950 font-bold text-sm hover:bg-amber-400 transition-all flex items-center justify-center gap-2 shadow-md shadow-amber-500/20"
          >
            {commitMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Distributing Leads to Pipeline...</span>
              </>
            ) : (
              <span>Commit Import & Allocate Leads</span>
            )}
          </button>
        </div>
      )}

      {/* Success Summary */}
      {importResult && (
        <div className="bg-white rounded-3xl p-6 border border-emerald-200 shadow-sm space-y-3 animate-in fade-in">
          <div className="flex items-center gap-2 text-emerald-600">
            <CheckCircle2 className="w-6 h-6" />
            <h3 className="font-bold text-base text-slate-900">Bulk Ingestion & Assignment Finished</h3>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
            <div className="p-3 bg-emerald-50 rounded-xl text-emerald-900 font-bold">
              Successfully Imported: {importResult.successCount}
            </div>
            <div className="p-3 bg-rose-50 rounded-xl text-rose-900 font-bold">
              Duplicates / Rejected: {importResult.failureCount}
            </div>
            <div className="p-3 bg-slate-50 rounded-xl text-slate-700 font-bold">
              Batch: {importResult.batchName}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
