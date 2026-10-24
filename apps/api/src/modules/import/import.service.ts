import { Injectable, BadRequestException } from '@nestjs/common';
import * as ExcelJS from 'exceljs';
import { Readable } from 'stream';
import { SupabaseService } from '../../db/supabase.service';
import { AuthUser } from '../../common/decorators/current-user.decorator';

@Injectable()
export class ImportService {
  constructor(private readonly supabaseService: SupabaseService) {}

  /**
   * Sanitizes formula injection triggers (=, +, -, @, \t, \r)
   */
  sanitizeCellValue(value: any): string {
    if (value === null || value === undefined) return '';
    const str = String(value).trim();
    if (['=', '+', '-', '@'].includes(str.charAt(0))) {
      return `'${str}`; // Prefix with single quote to deactivate spreadsheet formula execution
    }
    return str;
  }

  /**
   * Generates a sample Excel template buffer with realistic solar prospect data
   */
  async generateSampleExcel(): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Sample Solar Leads');

    worksheet.columns = [
      { header: 'Name', key: 'name', width: 22 },
      { header: 'Phone', key: 'phone', width: 16 },
      { header: 'Email', key: 'email', width: 24 },
      { header: 'City', key: 'city', width: 15 },
      { header: 'Monthly_Bill', key: 'monthly_bill', width: 15 },
      { header: 'System_KW', key: 'system_kw', width: 15 },
      { header: 'Category', key: 'category', width: 15 },
      { header: 'Source', key: 'source', width: 15 },
    ];

    const sampleRows = [
      { name: 'Ramesh Kulkarni', phone: '+919822001122', email: 'ramesh@example.in', city: 'Pune', monthly_bill: 3500, system_kw: 3.0, category: 'Residential', source: 'FB Ads' },
      { name: 'Pooja More', phone: '+919822003344', email: 'pooja@example.in', city: 'Mumbai', monthly_bill: 6000, system_kw: 5.0, category: 'Residential', source: 'WhatsApp Direct' },
      { name: 'Vikram Solar Cold Storage', phone: '+919822005566', email: 'contact@vikramstorage.in', city: 'Nashik', monthly_bill: 25000, system_kw: 10.0, category: 'Commercial', source: 'Referral' },
      { name: 'Sanjay Deshmukh', phone: '+919822007788', email: 'sanjay@example.in', city: 'Nagpur', monthly_bill: 4200, system_kw: 3.5, category: 'Residential', source: 'Google Ads' },
      { name: 'Apex Engineering Works', phone: '+919822009900', email: 'factory@apexeng.in', city: 'Aurangabad', monthly_bill: 32000, system_kw: 15.0, category: 'Commercial', source: 'Walk-in' },
    ];

    sampleRows.forEach((r) => worksheet.addRow(r));

    return (await workbook.xlsx.writeBuffer()) as unknown as Buffer;
  }

  generateSampleCsv(): string {
    return (
      'Name,Phone,Email,City,Monthly_Bill,System_KW,Category,Source\n' +
      'Ramesh Kulkarni,+919822001122,ramesh@example.in,Pune,3500,3.0,Residential,FB Ads\n' +
      'Pooja More,+919822003344,pooja@example.in,Mumbai,6000,5.0,Residential,WhatsApp Direct\n' +
      'Vikram Solar Cold Storage,+919822005566,contact@vikramstorage.in,Nashik,25000,10.0,Commercial,Referral\n' +
      'Sanjay Deshmukh,+919822007788,sanjay@example.in,Nagpur,4200,3.5,Residential,Google Ads\n' +
      'Apex Engineering Works,+919822009900,factory@apexeng.in,Aurangabad,32000,15.0,Commercial,Walk-in\n'
    );
  }

  /**
   * Parses Excel or CSV stream to extract headers and preview rows
   */
  async previewStream(
    buffer: Buffer,
    isCsv: boolean,
  ): Promise<{ headers: string[]; previewRows: Record<string, string>[]; totalRowsEstimate: number }> {
    const workbook = new ExcelJS.Workbook();
    const stream = Readable.from(buffer);

    if (isCsv) {
      await workbook.csv.read(stream);
    } else {
      await workbook.xlsx.read(stream);
    }

    const worksheet = workbook.worksheets[0];
    if (!worksheet) {
      throw new BadRequestException('Empty or corrupt spreadsheet file');
    }

    const headers: string[] = [];
    const previewRows: Record<string, string>[] = [];
    let rowCount = 0;

    worksheet.eachRow((row, rowNumber) => {
      rowCount++;
      const values = (row.values as any[]) || [];
      // Row 1 is header
      if (rowNumber === 1) {
        for (let col = 1; col < values.length; col++) {
          headers.push(String(values[col] || `Column_${col}`).trim());
        }
      } else if (previewRows.length < 10) {
        const rowData: Record<string, string> = {};
        headers.forEach((h, idx) => {
          rowData[h] = this.sanitizeCellValue(values[idx + 1]);
        });
        previewRows.push(rowData);
      }
    });

    return {
      headers,
      previewRows,
      totalRowsEstimate: Math.max(0, rowCount - 1),
    };
  }

  /**
   * Commits bulk lead import and distributes according to category allocation rules
   */
  async commitImport(
    user: AuthUser,
    body: {
      fileName: string;
      rows: Array<{
        name: string;
        phone: string;
        email?: string;
        city?: string;
        category?: string;
        source?: string;
        monthly_bill?: number;
        system_kw?: number;
      }>;
      rules?: {
        field: string; // e.g. 'category', 'city'
        splits: Array<{ value: string; targetUserId: string }>;
        defaultUserId?: string;
      };
    },
  ) {
    const { fileName, rows, rules } = body;

    if (!rows || rows.length === 0) {
      throw new BadRequestException('No rows provided for import');
    }

    if (rows.length > 10000) {
      throw new BadRequestException('Maximum batch size exceeded (limit: 10,000 rows)');
    }

    let ok = 0;
    let failed = 0;
    const errors: Array<{ row: number; phone: string; error: string }> = [];

    // Map targets by rule value
    const ruleMap = new Map<string, string>();
    if (rules?.splits) {
      rules.splits.forEach((s) => ruleMap.set(s.value.toLowerCase(), s.targetUserId));
    }

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      try {
        const phone = this.sanitizeCellValue(row.phone).replace(/\s+/g, '');
        if (!phone || phone.length < 10) {
          failed++;
          errors.push({ row: i + 1, phone, error: 'Invalid phone number format' });
          continue;
        }

        // Determine lead owner based on split rules
        let ownerId = user.id;
        if (rules?.field && row[rules.field as keyof typeof row]) {
          const ruleKey = String(row[rules.field as keyof typeof row]).toLowerCase();
          if (ruleMap.has(ruleKey)) {
            ownerId = ruleMap.get(ruleKey)!;
          } else if (rules.defaultUserId) {
            ownerId = rules.defaultUserId;
          }
        }

        const systemKw = Number(row.system_kw) || null;
        const valueEstimate = systemKw ? systemKw * 55000 : null;

        const { error } = await this.supabaseService.client.from('leads').insert({
          org_id: user.org_id,
          name: this.sanitizeCellValue(row.name) || 'Imported Lead',
          phone,
          email: this.sanitizeCellValue(row.email) || null,
          city: this.sanitizeCellValue(row.city) || null,
          category: this.sanitizeCellValue(row.category) || 'Residential',
          source: this.sanitizeCellValue(row.source) || 'Bulk Import',
          monthly_bill: Number(row.monthly_bill) || null,
          system_kw: systemKw,
          value_estimate: valueEstimate,
          owner_id: ownerId,
          created_by: user.id,
          stage: 'NEW',
          consent_recorded: true,
        });

        if (error) {
          failed++;
          errors.push({ row: i + 1, phone, error: error.message });
        } else {
          ok++;
        }
      } catch (err) {
        failed++;
        errors.push({ row: i + 1, phone: row.phone, error: err.message });
      }
    }

    // Save batch record
    await this.supabaseService.client.from('import_batches').insert({
      org_id: user.org_id,
      file_name: fileName,
      total: rows.length,
      ok,
      failed,
      rules: rules || {},
      by_user: user.id,
    });

    return {
      batchName: fileName,
      total: rows.length,
      successCount: ok,
      failureCount: failed,
      errors: errors.slice(0, 50), // Cap error summary payload
    };
  }
}
