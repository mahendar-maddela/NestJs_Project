import { Injectable, NotFoundException } from '@nestjs/common';
import { InvoiceRepository } from '../repositories/invoice.repository';
import { InvoicePdfService } from './invoice-pdf.service';

/** Mirrors `controllers/APP/invoiceController.js`. */
@Injectable()
export class AppInvoiceService {
  constructor(
    private readonly invoiceRepo: InvoiceRepository,
    private readonly invoicePdfService: InvoicePdfService,
  ) {}

  async getInvoice(id: number, clientId: number) {
    const transaction = await this.invoiceRepo.findByIdWithUser(id);
    if (!transaction) {
      throw new NotFoundException({ success: false, message: 'Transaction not found' });
    }

    const clientDetails = await this.invoiceRepo.findClientDetails(clientId);
    const buffer = await this.invoicePdfService.generateInvoicePdf(transaction as any, clientDetails);

    return { buffer, transactionId: (transaction as any).transactionId };
  }

  async getDeviceTransactionSummary(id: number) {
    const transaction: any = await this.invoiceRepo.findByIdWithFullDetails(id);
    if (!transaction) {
      throw new NotFoundException({ success: false, message: 'Transaction not found' });
    }

    const connector = transaction.connectorId && transaction.chargerRef ? await this.invoiceRepo.findConnector(transaction.connectorId, transaction.chargerRef) : null;

    const combinedData = { ...transaction, connectorDetails: connector };
    return { success: true, message: 'Transaction summary fetched successfully', data: combinedData };
  }
}
