/**
 * Kyros Solar CRM — Excel Streaming Worker Client
 * Spawns and communicates with `excel-parser.worker.ts` to decode massive sheets (>25,000 rows)
 * off the main UI thread with live percentage & row-count progress.
 */

export interface ExcelStreamProgress {
  stage: 'reading' | 'unzipping' | 'shared_strings' | 'streaming_rows' | 'finalizing';
  percent: number;
  rowsProcessed: number;
  totalEstimate?: number;
}

export interface ExcelStreamResult {
  headers: string[];
  previewRows: Record<string, string>[];
  totalRows: number;
  durationMs: number;
}

export function parseSpreadsheetWithWorker(
  file: File | Blob,
  fileName: string,
  onProgress?: (progress: ExcelStreamProgress) => void,
  maxPreviewRows = 50,
): Promise<ExcelStreamResult> {
  return new Promise((resolve, reject) => {
    const requestId = `worker-req-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

    // Initialize worker using Vite's native URL worker syntax
    let worker: Worker | null = null;
    try {
      worker = new Worker(
        new URL('../workers/excel-parser.worker.ts', import.meta.url),
        { type: 'module' },
      );
    } catch (err: any) {
      return reject(new Error('Failed to instantiate Excel Streaming WebWorker: ' + err.message));
    }

    const cleanup = () => {
      if (worker) {
        worker.terminate();
        worker = null;
      }
    };

    worker.onmessage = (event: MessageEvent<any>) => {
      const data = event.data;
      if (!data || data.id !== requestId) return;

      if (data.type === 'PROGRESS') {
        if (onProgress) {
          onProgress({
            stage: data.stage,
            percent: data.percent,
            rowsProcessed: data.rowsProcessed,
            totalEstimate: data.totalEstimate,
          });
        }
      } else if (data.type === 'COMPLETE') {
        cleanup();
        resolve({
          headers: data.headers,
          previewRows: data.previewRows,
          totalRows: data.totalRows,
          durationMs: data.durationMs,
        });
      } else if (data.type === 'ERROR') {
        cleanup();
        reject(new Error(data.error || 'Failed to parse sheet in WebWorker'));
      }
    };

    worker.onerror = (err) => {
      cleanup();
      reject(new Error('WebWorker runtime error: ' + (err.message || 'Worker crash')));
    };

    // Send payload to worker
    worker.postMessage({
      id: requestId,
      file,
      fileName,
      maxPreviewRows,
    });
  });
}
