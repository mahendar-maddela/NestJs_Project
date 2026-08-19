import { Body, Controller, Get, Param, ParseIntPipe, Post, Put, Query, Req, UseGuards } from '@nestjs/common';
import { SuperAdminAuthGuard } from '@modules/auth';
import { SuperAdminClientSupportService } from '../services/super-admin-client-support.service';
import {
  ClientSupportQueryDto,
  CreateClientSupportDto,
  UpdateClientSupportDto,
  AssignSupportDto,
  StatusUpdateSupportDto,
  SendSupportMessageDto,
} from '../dto/super-admin-client-support.dto';

/** Mirrors `routes/SuperAdmin/clientSupportRoutes.js`. */
@Controller('v1/super-admin/client-support')
@UseGuards(SuperAdminAuthGuard)
export class SuperAdminClientSupportController {
  constructor(private readonly clientSupportService: SuperAdminClientSupportService) {}

  private superAdminId(req: any): number {
    return Number(req.user?.sub || req.user?.id || 0);
  }

  @Get()
  async getAllSupports(@Query() query: ClientSupportQueryDto) {
    return this.clientSupportService.getAllSupports(query);
  }

  @Get('messages/:supportId')
  async getSupportMessage(@Param('supportId', ParseIntPipe) supportId: number) {
    return this.clientSupportService.getSupportMessage(supportId);
  }

  @Get('support-status-count')
  async supportStatusCount() {
    return this.clientSupportService.supportStatusCount();
  }

  @Get(':id')
  async getClientSupportById(@Param('id', ParseIntPipe) id: number) {
    return this.clientSupportService.getClientSupportById(id);
  }

  @Put(':id')
  async updateSupport(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateClientSupportDto) {
    return this.clientSupportService.updateSupport(id, dto);
  }

  @Post('messages/:supportId')
  async sendMessage(@Req() req: any, @Param('supportId', ParseIntPipe) supportId: number, @Body() dto: SendSupportMessageDto) {
    return this.clientSupportService.sendMessage(supportId, this.superAdminId(req), dto);
  }

  @Post(':id/assign')
  async assaignSupportToEmployee(@Param('id', ParseIntPipe) id: number, @Body() dto: AssignSupportDto) {
    return this.clientSupportService.assaignSupportToEmployee(id, dto);
  }

  @Put(':id/status')
  async statusUpdateSupport(@Param('id', ParseIntPipe) id: number, @Body() dto: StatusUpdateSupportDto) {
    return this.clientSupportService.statusUpdateSupport(id, dto);
  }

  @Post()
  async createSupport(@Req() req: any, @Body() dto: CreateClientSupportDto) {
    return this.clientSupportService.createSupport(this.superAdminId(req), dto);
  }
}
