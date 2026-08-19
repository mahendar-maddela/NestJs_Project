import { Controller, Get, Param, ParseIntPipe, Req, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { UserAuthGuard } from '@modules/auth';
import { AppInvoiceService } from '../services/app-invoice.service';

/** Mirrors `routes/app/invoiceRoute.js`. */
@Controller('v1/invoice')
@UseGuards(UserAuthGuard)
export class AppInvoiceController {
  constructor(private readonly invoiceService: AppInvoiceService) {}

  @Get(':id')
  async getInvoice(@Req() req: any, @Param('id', ParseIntPipe) id: number, @Res() res: Response) {
    const { buffer, transactionId } = await this.invoiceService.getInvoice(id, Number(req.user.clientId));
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Length': String(buffer.length),
      'Content-Disposition': `attachment; filename="invoice_${transactionId}.pdf"`,
    });
    res.status(200).send(buffer);
  }

  @Get('summary/:id')
  async getDeviceTransactionSummary(@Param('id', ParseIntPipe) id: number) {
    return this.invoiceService.getDeviceTransactionSummary(id);
  }
}
