import { Body, Controller, Get, Param, ParseIntPipe, Post, Put, Query, Req, UseGuards } from '@nestjs/common';
import { VendorAuthGuard } from '@modules/auth';
import { VendorStationService } from '../services/vendor-station.service';

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
    if (req.files['stationMedia[0]']) {
      const val = req.files['stationMedia[0]'];
      return Array.isArray(val) ? val[0] : val;
    }
    if (req.files['stationMedia']) {
      const val = req.files['stationMedia'];
      return Array.isArray(val) ? val[0] : val;
    }
    if (req.files['image']) {
      const val = req.files['image'];
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
    if (req.body['stationMedia[0]']) {
      const val = req.body['stationMedia[0]'];
      return Array.isArray(val) ? val[0] : val;
    }
    if (req.body['stationMedia']) {
      const val = req.body['stationMedia'];
      return Array.isArray(val) ? val[0] : val;
    }
    if (req.body['image']) {
      const val = req.body['image'];
      return Array.isArray(val) ? val[0] : val;
    }
  }

  if (req.file && typeof req.file !== 'function') {
    return req.file;
  }

  return undefined;
}

/** Mirrors `routes/vendor/stationRoutes.js` + `controllers/vendors/stationController.js`. */
@Controller('v1/vendor/station')
@UseGuards(VendorAuthGuard)
export class VendorStationsController {
  constructor(private readonly stationService: VendorStationService) {}

  private vendorId(req: any): number {
    return Number(req.vendor?.vendorId || req.user?.id || 0);
  }

  private clientId(req: any): number {
    return Number(req.vendor?.clientId || req.user?.clientId || req.headers['x-client-id'] || 0);
  }

  private empId(req: any): number {
    return Number(req.vendor?.empId || req.user?.id || 0);
  }

  @Get()
  async getVendorStation(@Req() req: any, @Query('page') page?: string, @Query('limit') limit?: string) {
    return this.stationService.getVendorStation(this.vendorId(req), page ? Number(page) : undefined, limit ? Number(limit) : undefined);
  }

  @Get('all/stations')
  async getVendorAllStation(@Req() req: any, @Query('page') page?: string, @Query('limit') limit?: string) {
    return this.stationService.getVendorAllStation(this.vendorId(req), page ? Number(page) : undefined, limit ? Number(limit) : undefined);
  }

  @Get('all/station/download')
  async getAllStation(@Req() req: any) {
    return this.stationService.getAllStation(this.vendorId(req));
  }

  @Get(':id')
  async getVendorStationById(@Req() req: any, @Param('id', ParseIntPipe) id: number) {
    return this.stationService.getVendorStationById(id, this.clientId(req));
  }

  @Post()
  async vendorCreateStation(@Req() req: any, @Body() body: any) {
    const file = extractUploadedFile(req);
    return this.stationService.vendorCreateStation(this.vendorId(req), this.clientId(req), this.empId(req), req.body || body || {}, file);
  }

  @Put(':id')
  async vendorUpdateStation(@Req() req: any, @Param('id', ParseIntPipe) id: number, @Body() body: any) {
    const file = extractUploadedFile(req);
    return this.stationService.vendorUpdateStation(id, this.clientId(req), req.body || body || {}, file);
  }
}
