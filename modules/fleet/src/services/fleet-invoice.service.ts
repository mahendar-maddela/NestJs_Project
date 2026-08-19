import { Injectable, NotFoundException } from '@nestjs/common';
import { InvoiceRepository } from '../../../sessions/src/repositories/invoice.repository';
import { InvoicePdfService } from '../../../sessions/src/services/invoice-pdf.service';

/** Mirrors `controllers/Fleet/invoiceController.js:getFleetInvoice`. */
@Injectable()
export class FleetInvoiceService {
  constructor(
    private readonly invoiceRepo: InvoiceRepository,
    private readonly invoicePdfService: InvoicePdfService,
  ) {}

  async getFleetInvoice(transactionId: number, clientId: number) {
    const transaction = await this.invoiceRepo.findByIdWithFleetUser(transactionId);
    if (!transaction) {
      throw new NotFoundException({ success: false, message: 'Transaction not found' });
    }

    const clientDetails = await this.invoiceRepo.findClientDetails(clientId);
    const buffer = await this.invoicePdfService.generateInvoicePdf(transaction as any, clientDetails);

    return { buffer, transactionId: (transaction as any).transactionId };
  }
}
