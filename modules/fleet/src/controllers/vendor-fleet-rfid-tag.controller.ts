import { Body, Controller, Delete, Get, Param, ParseIntPipe, Post, Put, Query, Req, UseGuards } from '@nestjs/common';
import { VendorAuthGuard } from '@modules/auth';
import { VendorFleetRfidTagService } from '../services/vendor-fleet-rfid-tag.service';
import { CreateVendorFleetRfidTagDto, UpdateVendorFleetRfidTagDto } from '../dto/vendor-fleet-rfid-tag.dto';

/** Mirrors `routes/vendor/fleet/rfidTagRoutes.js` + `controllers/vendors/Fleet/rfIdController.js`. */
@Controller('v1/vendor/fleet/rfid-tag')
@UseGuards(VendorAuthGuard)
export class VendorFleetRfidTagController {
  constructor(private readonly rfidTagService: VendorFleetRfidTagService) {}

  private vendorId(req: any): number {
    return Number(req.vendor?.vendorId || req.user?.id || 0);
  }

  private clientId(req: any): number {
    return Number(req.vendor?.clientId || req.user?.clientId || req.headers['x-client-id'] || 0);
  }

  @Get('single/:rfId')
  async getCpoRFIDTagById(@Req() req: any, @Param('rfId', ParseIntPipe) rfId: number) {
    return this.rfidTagService.getCpoRFIDTagById(rfId, this.clientId(req));
  }

  @Get(':groupId')
  async getCpoAllRFIDsByFleetId(
    @Req() req: any,
    @Param('groupId', ParseIntPipe) groupId: number,
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.rfidTagService.getCpoAllRFIDsByFleetId(groupId, this.vendorId(req), search, Number(page) || 1, Number(limit) || 10);
  }

  @Post()
  async cpoCreateRfidTag(@Req() req: any, @Body() dto: CreateVendorFleetRfidTagDto) {
    return this.rfidTagService.cpoCreateRfidTag(this.vendorId(req), this.clientId(req), dto);
  }

  @Put(':rfId')
  async cpoUpdateRfidTag(@Req() req: any, @Param('rfId', ParseIntPipe) rfId: number, @Body() dto: UpdateVendorFleetRfidTagDto) {
    return this.rfidTagService.cpoUpdateRfidTag(rfId, this.clientId(req), dto);
  }

  @Delete(':rfId')
  async cpoDeleteRfidTag(@Req() req: any, @Param('rfId', ParseIntPipe) rfId: number) {
    return this.rfidTagService.cpoDeleteRfidTag(rfId, this.clientId(req));
  }
}
