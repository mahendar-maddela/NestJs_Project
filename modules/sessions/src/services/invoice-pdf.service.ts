import { Injectable } from '@nestjs/common';
import { PdfService } from '@integrations/pdf';
import { buildDeviceTransactionInvoiceHtml, InvoiceClientDetails, InvoiceTransactionData } from '@app/common';

/** Mirrors `utils/globalInvoicePdf.js:generateGlobalPdf` — shared by fleet/web/app/OCPI invoice routes. */
@Injectable()
export class InvoicePdfService {
  constructor(private readonly pdfService: PdfService) {}

  async generateInvoicePdf(transaction: InvoiceTransactionData, clientDetails: InvoiceClientDetails | null | undefined): Promise<Buffer> {
    const html = buildDeviceTransactionInvoiceHtml(transaction, clientDetails);
    return this.pdfService.generatePdfFromHtml(html, { format: 'A3' });
  }
}
