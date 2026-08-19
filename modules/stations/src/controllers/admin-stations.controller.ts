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
import { AdminStationsService } from '../services/admin-stations.service';
import { AdminAuthGuard, StaffPermissionsGuard, StaffPermission } from '@modules/auth';

function extractUploadedFile(req: any): any {
  if (req.files) {
    if (Array.isArray(req.files)) return req.files[0];
    if (req.files['files[0]']) {
      const val = req.files['files[0]'];
      return Array.isArray(val) ? val[0] : val;
    }
    if (req.files['file']) {
      const val = req.files['file'];
      return Array.isArray(val) ? val[0] : val;
    }
    const keys = Object.keys(req.files);
    if (keys.length > 0) {
      const val = req.files[keys[0]];
      return Array.isArray(val) ? val[0] : val;
    }
  }

  if (req.body) {
    if (req.body['files[0]']) {
      const val = req.body['files[0]'];
      return Array.isArray(val) ? val[0] : val;
    }
    if (req.body['file']) {
      const val = req.body['file'];
      return Array.isArray(val) ? val[0] : val;
    }
    if (req.body['files']) {
      const val = req.body['files'];
      return Array.isArray(val) ? val[0] : val;
    }
  }

  if (req.file && typeof req.file !== 'function') {
    return req.file;
  }

  return undefined;
}

@Controller('v1/admin/station')
@UseGuards(AdminAuthGuard, StaffPermissionsGuard)
export class AdminStationsController {
  constructor(private readonly adminStationsService: AdminStationsService) {}

  private clientId(req: any): number {
    return Number(req.client?.clientId || req.user?.clientId || req.headers['x-client-id']);
  }

  @Post()
  @StaffPermission('Station_Onboard')
  async createStation(@Req() req: any, @Body() body: any) {
    const staffId = req.user?.id || req.user?.sub;
    const clientId = this.clientId(req);
    const file = extractUploadedFile(req);
    const payload = req.body || body || {};
    return this.adminStationsService.createStation(payload, file, staffId, clientId);
  }

  @Get()
  @StaffPermission('Station_View')
  async getAllStations(@Req() req: any, @Query() query: any) {
    const clientId = this.clientId(req);
    return this.adminStationsService.getAllStations(query, clientId);
  }

  @Get(':id')
  @StaffPermission('Station_View')
  async getStationById(@Req() req: any, @Param('id', ParseIntPipe) id: number) {
    const clientId = this.clientId(req);
    return this.adminStationsService.getStationById(id, clientId);
  }

  @Put(':id')
  @StaffPermission('Station_View')
  async updateStation(@Req() req: any, @Param('id', ParseIntPipe) id: number, @Body() body: any) {
    const clientId = this.clientId(req);
    const file = extractUploadedFile(req);
    const payload = req.body || body || {};
    return this.adminStationsService.updateStation(id, payload, file, clientId);
  }

  @Delete(':id')
  @StaffPermission('Station_Edit')
  async deleteStation(@Req() req: any, @Param('id', ParseIntPipe) id: number) {
    const clientId = this.clientId(req);
    return this.adminStationsService.deleteStation(id, clientId);
  }

  @Put('status/:id')
  @StaffPermission('Station_Edit')
  async statusUpdate(
    @Req() req: any,
    @Param('id', ParseIntPipe) id: number,
    @Body('status') status: string,
  ) {
    const clientId = this.clientId(req);
    return this.adminStationsService.updateStatus(id, status, clientId);
  }
}
