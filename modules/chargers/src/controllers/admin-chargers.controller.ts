import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  Req,
  ParseIntPipe,
} from '@nestjs/common';
import { AdminChargersService } from '../services/admin-chargers.service';
import { AdminAuthGuard, StaffPermissionsGuard, StaffPermission } from '@modules/auth';

@Controller('v1/admin/charger')
@UseGuards(AdminAuthGuard, StaffPermissionsGuard)
export class AdminChargersController {
  constructor(private readonly adminChargersService: AdminChargersService) {}

  @Post()
  @StaffPermission('Charger_Onboard')
  async createCharger(@Req() req: any, @Body() body: any) {
    const staffId = req.user?.id || req.user?.sub;
    const clientId = Number(req.client?.clientId || req.user?.clientId || req.headers['x-client-id'] );
    return this.adminChargersService.createCharger(body, staffId, clientId);
  }

  @Get()
  @StaffPermission('Charger_View')
  async getAllChargers(@Req() req: any, @Query() query: any) {
    const clientId = Number(req.client?.clientId || req.user?.clientId || req.headers['x-client-id'] );
    return this.adminChargersService.getAllChargers(query, clientId);
  }

  @Get('station/:id')
  @StaffPermission('Charger_View')
  async getChargerByStationId(@Req() req: any, @Param('id', ParseIntPipe) id: number) {
    const clientId = Number(req.client?.clientId || req.user?.clientId || req.headers['x-client-id'] );
    return this.adminChargersService.getChargerByStationId(id, clientId);
  }

  @Get('details/:chargerId')
  @StaffPermission('Charger_View')
  async chargeDetails(@Param('chargerId') chargerId: string, @Query('detail') detail?: string) {
    return this.adminChargersService.chargeDetails(chargerId, detail);
  }

  @Get('logs/date-wise/:id')
  @StaffPermission('Charger_View')
  async getLogsDateWise(@Req() req: any, @Param('id', ParseIntPipe) id: number, @Query() query: any) {
    const clientId = Number(req.client?.clientId || req.user?.clientId || req.headers['x-client-id'] );
    return this.adminChargersService.getLogsDateWise(id, query, clientId);
  }

  @Get('logs/:id')
  @StaffPermission('Charger_View')
  async deviceLogs(@Req() req: any, @Param('id', ParseIntPipe) id: number, @Query() query: any) {
    const clientId = Number(req.client?.clientId || req.user?.clientId || req.headers['x-client-id'] );
    return this.adminChargersService.deviceLogs(id, query, clientId);
  }

  @Get('config/:id')
  @StaffPermission('Charger_View')
  async getChargerByIdForConfig(@Req() req: any, @Param('id', ParseIntPipe) id: number) {
    const clientId = Number(req.client?.clientId || req.user?.clientId || req.headers['x-client-id'] );
    return this.adminChargersService.getChargerByIdForConfig(id, clientId);
  }

  @Get(':id')
  @StaffPermission('Charger_View')
  async getChargerById(@Req() req: any, @Param('id', ParseIntPipe) id: number) {
    const clientId = Number(req.client?.clientId || req.user?.clientId || req.headers['x-client-id'] );
    return this.adminChargersService.getChargerById(id, clientId);
  }

  @Put(':id')
  @StaffPermission('Charger_Edit')
  async updateCharger(@Req() req: any, @Param('id', ParseIntPipe) id: number, @Body() body: any) {
    const clientId = Number(req.client?.clientId || req.user?.clientId || req.headers['x-client-id'] );
    return this.adminChargersService.updateCharger(id, body, clientId);
  }

  @Delete(':id')
  @StaffPermission('Charger_View')
  async deleteCharger(@Req() req: any, @Param('id', ParseIntPipe) id: number) {
    const clientId = Number(req.client?.clientId || req.user?.clientId || req.headers['x-client-id'] );
    return this.adminChargersService.deleteCharger(id, clientId);
  }
}
