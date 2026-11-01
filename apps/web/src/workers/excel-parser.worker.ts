/**
 * Kyros Solar CRM — WebWorker-based Excel & CSV Streaming Parser
 * Offloads heavy sheet decoding (supporting >25,000 rows) off the main browser thread.
 * Emits incremental progress updates and preview chunks to prevent UI jank.
 */

export interface ParseRequest {
  id: string;
  file: Blob;
  fileName: string;
  maxPreviewRows?: number;
}

export interface ProgressPayload {
  id: string;
  type: 'PROGRESS';
  stage: 'reading' | 'unzipping' | 'shared_strings' | 'streaming_rows' | 'finalizing';
  percent: number;
  rowsProcessed: number;
  totalEstimate?: number;
}

export interface CompletePayload {
  id: string;
  type: 'COMPLETE';
  headers: string[];
  previewRows: Record<string, string>[];
  totalRows: number;
  durationMs: number;
}

export interface ErrorPayload {
  id: string;
  type: 'ERROR';
  error: string;
}

type WorkerResponse = ProgressPayload | CompletePayload | ErrorPayload;

// Helper to post typed messages back to client
function postMsg(msg: WorkerResponse) {
  self.postMessage(msg);
}

// Minimal sanitization for formula injection protection
function sanitizeCell(val: string): string {
  const trimmed = val.trim();
  if (trimmed.length > 0 && ['=', '+', '-', '@'].includes(trimmed[0])) {
    return `'${trimmed}`;
  }
  return trimmed;
}

// Convert column letters (A, B, AA...) to 0-based index
function colLetterToIndex(col: string): number {
  let index = 0;
  for (let i = 0; i < col.length; i++) {
    index = index * 26 + (col.charCodeAt(i) - 64);
  }
  return index - 1;
}

// Unzip helper using native browser DecompressionStream('deflate-raw')
async function decompressDeflateRaw(buffer: Uint8Array): Promise<Uint8Array> {
  if (typeof DecompressionStream === 'undefined') {
    throw new Error('DecompressionStream is not supported in this browser.');
  }
  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(buffer);
      controller.close();
    },
  });
  const decompressedStream = stream.pipeThrough(new DecompressionStream('deflate-raw'));
  const response = new Response(decompressedStream);
  const arrayBuffer = await response.arrayBuffer();
  return new Uint8Array(arrayBuffer);
}

interface ZipEntry {
  name: string;
  compressionMethod: number;
  compressedSize: number;
  uncompressedSize: number;
  offset: number;
}

async function extractZipEntries(buffer: Uint8Array): Promise<Map<string, Uint8Array>> {
  const view = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength);
  const entries = new Map<string, Uint8Array>();
  let offset = 0;

  while (offset + 30 <= buffer.byteLength) {
    const sig = view.getUint32(offset, true);
    if (sig !== 0x04034b50) {
      // Local file header signature not found (may have reached central directory or end)
      break;
    }

    const compression = view.getUint16(offset + 8, true);
    const compressedSize = view.getUint32(offset + 18, true);
    const fileNameLen = view.getUint16(offset + 26, true);
    const extraFieldLen = view.getUint16(offset + 28, true);

    const nameBytes = buffer.subarray(offset + 30, offset + 30 + fileNameLen);
    const name = new TextDecoder().decode(nameBytes);

    const dataStart = offset + 30 + fileNameLen + extraFieldLen;
    const dataEnd = dataStart + compressedSize;

    if (dataEnd <= buffer.byteLength) {
      const rawData = buffer.subarray(dataStart, dataEnd);
      if (compression === 0) {
        entries.set(name, rawData);
      } else if (compression === 8) {
        try {
          const decompressed = await decompressDeflateRaw(rawData);
          entries.set(name, decompressed);
        } catch {
          // Skip corrupt or unsupported sub-file
        }
      }
    }

    offset = dataEnd;
  }

  return entries;
}

// Parse XLSX Sheet
async function parseXlsx(
  fileBlob: Blob,
  id: string,
  maxPreviewRows: number,
): Promise<{ headers: string[]; previewRows: Record<string, string>[]; totalRows: number }> {
  postMsg({
    id,
    type: 'PROGRESS',
    stage: 'reading',
    percent: 10,
    rowsProcessed: 0,
  });

  const arrayBuffer = await fileBlob.arrayBuffer();
  const bytes = new Uint8Array(arrayBuffer);

  postMsg({
    id,
    type: 'PROGRESS',
    stage: 'unzipping',
    percent: 25,
    rowsProcessed: 0,
  });

  const entries = await extractZipEntries(bytes);

  // 1. Parse Shared Strings if present
  const sharedStrings: string[] = [];
  const sstEntry = entries.get('xl/sharedStrings.xml');
  if (sstEntry) {
    postMsg({
      id,
      type: 'PROGRESS',
      stage: 'shared_strings',
      percent: 40,
      rowsProcessed: 0,
    });
    const sstXml = new TextDecoder().decode(sstEntry);
    // Fast regex extraction of <si> items
    const siRegex = /<si>(.*?)<\/si>/gs;
    let match: RegExpExecArray | null;
    while ((match = siRegex.exec(sstXml)) !== null) {
      const tMatch = /<t[^>]*>(.*?)<\/t>/gs;
      let text = '';
      let m: RegExpExecArray | null;
      while ((m = tMatch.exec(match[1])) !== null) {
        text += m[1];
      }
      sharedStrings.push(
        text
          .replace(/&amp;/g, '&')
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .replace(/&quot;/g, '"')
          .replace(/&apos;/g, "'"),
      );
    }
  }

  // 2. Find first worksheet
  let sheetEntry = entries.get('xl/worksheets/sheet1.xml');
  if (!sheetEntry) {
    for (const [key, val] of entries.entries()) {
      if (key.startsWith('xl/worksheets/sheet') && key.endsWith('.xml')) {
        sheetEntry = val;
        break;
      }
    }
  }

  if (!sheetEntry) {
    throw new Error('No valid worksheet found in the uploaded .xlsx workbook');
  }

  postMsg({
    id,
    type: 'PROGRESS',
    stage: 'streaming_rows',
    percent: 55,
    rowsProcessed: 0,
  });

  const sheetXml = new TextDecoder().decode(sheetEntry);
  const rowRegex = /<row\b[^>]*>(.*?)<\/row>/gs;
  const cellRegex = /<c\b[^>]*r="([A-Z]+)(\d+)"(?:[^>]*t="([a-z]+)")?[^>]*>(?:<v>(.*?)<\/v>)?<\/c>/g;

  let headers: string[] = [];
  const previewRows: Record<string, string>[] = [];
  let rowCount = 0;
  let lastReportedProgress = 55;

  let rowMatch: RegExpExecArray | null;
  while ((rowMatch = rowRegex.exec(sheetXml)) !== null) {
    const rowContent = rowMatch[1];
    const cells: string[] = [];

    cellRegex.lastIndex = 0;
    let cellMatch: RegExpExecArray | null;
    while ((cellMatch = cellRegex.exec(rowContent)) !== null) {
      const colLetter = cellMatch[1];
      const type = cellMatch[3];
      const rawVal = cellMatch[4] ?? '';
      const colIndex = colLetterToIndex(colLetter);

      let val = rawVal;
      if (type === 's') {
        const strIndex = parseInt(rawVal, 10);
        val = sharedStrings[strIndex] ?? '';
      }

      cells[colIndex] = sanitizeCell(val);
    }

    if (rowCount === 0) {
      headers = cells.filter((h) => h !== undefined && h !== '').map((h) => h.trim());
      if (headers.length === 0) {
        headers = ['Col1', 'Col2', 'Col3', 'Col4', 'Col5'];
      }
    } else {
      const rowObj: Record<string, string> = {};
      headers.forEach((h, idx) => {
        rowObj[h] = cells[idx] ?? '';
      });

      if (previewRows.length < maxPreviewRows) {
        previewRows.push(rowObj);
      }
    }

    rowCount++;

    // Emit streaming progress every 2,500 rows
    if (rowCount % 2500 === 0) {
      const currentPct = Math.min(95, Math.floor(55 + (rowCount / 30000) * 40));
      if (currentPct > lastReportedProgress) {
        lastReportedProgress = currentPct;
        postMsg({
          id,
          type: 'PROGRESS',
          stage: 'streaming_rows',
          percent: currentPct,
          rowsProcessed: rowCount - 1,
        });
      }
    }
  }

  const totalRows = Math.max(0, rowCount - 1);

  return {
    headers,
    previewRows,
    totalRows,
  };
}

// Parse CSV Streaming
async function parseCsv(
  fileBlob: Blob,
  id: string,
  maxPreviewRows: number,
): Promise<{ headers: string[]; previewRows: Record<string, string>[]; totalRows: number }> {
  postMsg({
    id,
    type: 'PROGRESS',
    stage: 'reading',
    percent: 15,
    rowsProcessed: 0,
  });

  const text = await fileBlob.text();
  const lines = text.split(/\r\n|\n|\r/);

  postMsg({
    id,
    type: 'PROGRESS',
    stage: 'streaming_rows',
    percent: 30,
    rowsProcessed: 0,
    totalEstimate: lines.length,
  });

  if (lines.length === 0 || !lines[0].trim()) {
    throw new Error('CSV file appears to be completely empty');
  }

  // Detect delimiter: comma, semicolon, tab
  const headerLine = lines[0];
  let delimiter = ',';
  if (headerLine.includes('\t') && !headerLine.includes(',')) delimiter = '\t';
  else if (headerLine.includes(';') && !headerLine.includes(',')) delimiter = ';';

  function parseCsvLine(line: string): string[] {
    const result: string[] = [];
    let insideQuote = false;
    let entry = '';

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        if (insideQuote && line[i + 1] === '"') {
          entry += '"';
          i++;
        } else {
          insideQuote = !insideQuote;
        }
      } else if (char === delimiter && !insideQuote) {
        result.push(entry);
        entry = '';
      } else {
        entry += char;
      }
    }
    result.push(entry);
    return result;
  }

  const rawHeaders = parseCsvLine(lines[0]).map((h) => sanitizeCell(h));
  const headers = rawHeaders.filter((h) => h.length > 0);
  const previewRows: Record<string, string>[] = [];

  let validRowCount = 0;
  for (let i = 1; i < lines.length; i++) {
    const rawLine = lines[i];
    if (!rawLine.trim()) continue;

    const values = parseCsvLine(rawLine);
    const rowObj: Record<string, string> = {};
    headers.forEach((h, colIdx) => {
      rowObj[h] = sanitizeCell(values[colIdx] || '');
    });

    if (previewRows.length < maxPreviewRows) {
      previewRows.push(rowObj);
    }
    validRowCount++;

    if (validRowCount % 5000 === 0) {
      const pct = Math.min(95, Math.floor(30 + (validRowCount / lines.length) * 65));
      postMsg({
        id,
        type: 'PROGRESS',
        stage: 'streaming_rows',
        percent: pct,
        rowsProcessed: validRowCount,
        totalEstimate: lines.length,
      });
    }
  }

  return {
    headers,
    previewRows,
    totalRows: validRowCount,
  };
}

// Worker message listener
self.onmessage = async (event: MessageEvent<ParseRequest>) => {
  const { id, file, fileName, maxPreviewRows = 50 } = event.data;
  const startTime = performance.now();

  try {
    const lowerName = fileName.toLowerCase();
    let result: { headers: string[]; previewRows: Record<string, string>[]; totalRows: number };

    if (lowerName.endsWith('.xlsx') || lowerName.endsWith('.xls')) {
      result = await parseXlsx(file, id, maxPreviewRows);
    } else {
      result = await parseCsv(file, id, maxPreviewRows);
    }

    const durationMs = Math.round(performance.now() - startTime);

    postMsg({
      id,
      type: 'COMPLETE',
      headers: result.headers,
      previewRows: result.previewRows,
      totalRows: result.totalRows,
      durationMs,
    });
  } catch (err: any) {
    postMsg({
      id,
      type: 'ERROR',
      error: err.message || 'Worker failed to decode spreadsheet',
    });
  }
};
