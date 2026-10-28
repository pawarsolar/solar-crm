import { Injectable } from '@nestjs/common';
import * as ExcelJS from 'exceljs';
import PdfPrinter from 'pdfmake';
import { Response } from 'express';
import { SupabaseService } from '../../db/supabase.service';
import { AuthUser } from '../../common/decorators/current-user.decorator';

@Injectable()
export class ExportsService {
  constructor(private readonly supabaseService: SupabaseService) {}

  /**
   * Streams pipeline data to Excel (.xlsx) using ExcelJS streaming writer
   */
  async streamPipelineExcel(res: Response, user: AuthUser) {
    const workbook = new ExcelJS.stream.xlsx.WorkbookWriter({
      stream: res,
      useStyles: true,
      useSharedStrings: true,
    });

    const worksheet = workbook.addWorksheet('Solar Pipeline');

    worksheet.columns = [
      { header: 'Lead Name', key: 'name', width: 25 },
      { header: 'Phone', key: 'phone', width: 16 },
      { header: 'City', key: 'city', width: 15 },
      { header: 'Capacity (kW)', key: 'system_kw', width: 15 },
      { header: 'Stage', key: 'stage', width: 20 },
      { header: 'Est. Value (₹)', key: 'value_estimate', width: 18 },
      { header: 'Source', key: 'source', width: 15 },
      { header: 'Created Date', key: 'created_at', width: 15 },
    ];

    const { data: leads } = await this.supabaseService.client
      .from('leads')
      .select('name, phone, city, system_kw, stage, value_estimate, source, created_at')
      .eq('org_id', user.org_id)
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    (leads || []).forEach((lead) => {
      worksheet.addRow({
        name: lead.name,
        phone: lead.phone,
        city: lead.city || '-',
        system_kw: lead.system_kw || '-',
        stage: lead.stage,
        value_estimate: lead.value_estimate || 0,
        source: lead.source || 'Direct',
        created_at: new Date(lead.created_at).toLocaleDateString('en-IN'),
      }).commit();
    });

    await worksheet.commit();
    await workbook.commit();
  }

  /**
   * Generates pipeline summary PDF using pdfmake
   */
  async getPipelinePdfBuffer(user: AuthUser): Promise<Buffer> {
    const { data: leads } = await this.supabaseService.client
      .from('leads')
      .select('name, phone, city, system_kw, stage, value_estimate, source')
      .eq('org_id', user.org_id)
      .is('deleted_at', null)
      .limit(50);

    const fonts = {
      Roboto: {
        normal: Buffer.from(require('pdfmake/build/vfs_fonts.js').pdfMake.vfs['Roboto-Regular.ttf'], 'base64'),
        bold: Buffer.from(require('pdfmake/build/vfs_fonts.js').pdfMake.vfs['Roboto-Medium.ttf'], 'base64'),
      },
    };

    const printer = new PdfPrinter(fonts);

    const docDefinition: any = {
      content: [
        { text: 'KYROS SOLAR EPC — PIPELINE REPORT', style: 'header' },
        { text: `Generated on: ${new Date().toLocaleString('en-IN')}`, margin: [0, 0, 0, 15] },
        {
          table: {
            headerRows: 1,
            widths: ['*', 75, 55, 45, 75, 65],
            body: [
              ['Name', 'Phone', 'City', 'kW', 'Stage', 'Est. Value'],
              ...(leads || []).map((l) => [
                l.name,
                l.phone,
                l.city || '-',
                `${l.system_kw || '-'} kW`,
                l.stage,
                `₹${Number(l.value_estimate || 0).toLocaleString('en-IN')}`,
              ]),
            ],
          },
        },
      ],
      styles: {
        header: { fontSize: 16, bold: true, margin: [0, 0, 0, 5], color: '#f59e0b' },
      },
    };

    const pdfDoc = printer.createPdfKitDocument(docDefinition);
    const chunks: Buffer[] = [];

    return new Promise((resolve, reject) => {
      pdfDoc.on('data', (c) => chunks.push(c));
      pdfDoc.on('end', () => resolve(Buffer.concat(chunks)));
      pdfDoc.on('error', (e) => reject(e));
      pdfDoc.end();
    });
  }
}
