import { Body, Controller, Get, Param, ParseIntPipe, Post, Query, Req, UseGuards } from '@nestjs/common';
import { AdminAuthGuard } from '@modules/auth';
import { AdminSoftwareSupportService } from '../services/admin-software-support.service';
import { SoftwareSupportQueryDto, CreateSoftwareSupportDto, SendSoftwareSupportMessageDto } from '../dto/admin-software-support.dto';

/** Mirrors `routes/admin/softwareSupportRoutes.js` + `controllers/admin/softwareSupportController.js`. */
@Controller('v1/admin/software-support')
@UseGuards(AdminAuthGuard)
export class AdminSoftwareSupportController {
  constructor(private readonly softwareSupportService: AdminSoftwareSupportService) {}

  private clientId(req: any): number {
    return Number(req.client?.clientId || req.user?.clientId || req.headers['x-client-id'] || 0);
  }

  @Get()
  async getAllSupports(@Req() req: any, @Query() query: SoftwareSupportQueryDto) {
    return this.softwareSupportService.getAllSupports(this.clientId(req), query);
  }

  @Get('card')
  async supportCardStacks(@Req() req: any) {
    return this.softwareSupportService.supportCardStacks(this.clientId(req));
  }

  @Get('message/:supportId')
  async getSoftwareSupportMessage(
    @Param('supportId', ParseIntPipe) supportId: number,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.softwareSupportService.getSoftwareSupportMessage(supportId, Number(page) || 1, Number(limit) || 100);
  }

  @Get(':supportId')
  async getSupportTicketBySupportId(@Param('supportId', ParseIntPipe) supportId: number) {
    return this.softwareSupportService.getSupportTicketBySupportId(supportId);
  }

  @Post('message/:supportId')
  async sendSoftwareSupport(
    @Req() req: any,
    @Param('supportId', ParseIntPipe) supportId: number,
    @Body() dto: SendSoftwareSupportMessageDto,
  ) {
    // Legacy resolves this from `req.client.id`, not `req.client.clientId` — preserved as-is.
    const clientRecordId = Number(req.client?.id || 0);
    const staffId = req.user?.id || req.user?.sub;
    return this.softwareSupportService.sendSoftwareSupport(supportId, clientRecordId, staffId, dto);
  }

  @Post()
  async createSupport(@Req() req: any, @Body() dto: CreateSoftwareSupportDto) {
    const staffId = req.user?.id || req.user?.sub;
    return this.softwareSupportService.createSupport(this.clientId(req), { id: staffId, email: req.user?.email, first_name: req.user?.first_name, last_name: req.user?.last_name }, dto);
  }
}
