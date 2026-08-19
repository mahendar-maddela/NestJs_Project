import { Controller, Get, Param, ParseIntPipe, Query, Req, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { FleetAuthGuard } from '@modules/auth';
import { FleetDeviceTransactionService } from '../services/fleet-device-transaction.service';
import { FleetInvoiceService } from '../services/fleet-invoice.service';

/** Mirrors `routes/Fleet/deviceTransactionRoutes.js`. */
@Controller('v1/fleet/charging-session')
@UseGuards(FleetAuthGuard)
export class FleetDeviceTransactionController {
  constructor(
    private readonly deviceTransactionService: FleetDeviceTransactionService,
    private readonly invoiceService: FleetInvoiceService,
  ) {}

  @Get()
  async getAllDeviceTransactions(
    @Req() req: any,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('vehicle') vehicle?: string,
    @Query('driver') driver?: string,
    @Query('charger') charger?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('reason') reason?: string,
  ) {
    return this.deviceTransactionService.getAllDeviceTransactions(
      Number(req.user.fleetId),
      { search, vehicle, driver, charger, startDate, endDate, reason },
      Number(page) || 1,
      Number(limit) || 10,
    );
  }

  @Get('invoice/:transactionId')
  async getFleetInvoice(@Req() req: any, @Param('transactionId', ParseIntPipe) transactionId: number, @Res() res: Response) {
    const { buffer, transactionId: txId } = await this.invoiceService.getFleetInvoice(transactionId, Number(req.user.clientId));
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Length': String(buffer.length),
      'Content-Disposition': `attachment; filename="invoice_${txId}.pdf"`,
    });
    res.status(200).send(buffer);
  }
}
