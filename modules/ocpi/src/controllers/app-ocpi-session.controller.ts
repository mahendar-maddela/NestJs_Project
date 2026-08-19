import { Controller, Get, Param, ParseIntPipe, Req, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { UserAuthGuard } from '@modules/auth';
import { AppOcpiSessionService } from '../services/app-ocpi-session.service';

/** Mirrors `routes/app/ocpi/sessionsRoutes.js`. */
@Controller('v1/ocpi/sessions')
@UseGuards(UserAuthGuard)
export class AppOcpiSessionController {
  constructor(private readonly sessionService: AppOcpiSessionService) {}

  @Get('summary/:session_id')
  async getOcpiInvoiceSummary(@Req() req: any, @Param('session_id', ParseIntPipe) sessionId: number) {
    return this.sessionService.getOcpiInvoiceSummary(sessionId, req.user.id);
  }

  @Get('invoice/:session_id')
  async getOcpiInvoice(@Req() req: any, @Param('session_id', ParseIntPipe) sessionId: number, @Res() res: Response) {
    const { buffer, transactionId } = await this.sessionService.getOcpiInvoice(sessionId, req.user.id, Number(req.user.clientId));
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Length': String(buffer.length),
      'Content-Disposition': `attachment; filename="invoice_${transactionId}.pdf"`,
    });
    res.status(200).send(buffer);
  }

  @Get(':session_id')
  async getOcpiRunningSessionBySessionId(@Req() req: any, @Param('session_id') sessionId: string) {
    return this.sessionService.getOcpiRunningSessionBySessionId(sessionId, req.user.id);
  }
}
