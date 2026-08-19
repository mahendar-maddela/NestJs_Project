import { Body, Controller, Delete, Get, HttpCode, Param, ParseIntPipe, Post, Put, Query, Req, UseGuards } from '@nestjs/common';
import { VendorAuthGuard, VendorFeaturesGuard, VendorFeatureRequired } from '@modules/auth';
import { VendorRfidTagService } from '../services/vendor-rfid-tag.service';
import { CreateRfidTagDto, UpdateRfidTagDto } from '../dto/admin-rfid-tag.dto';

/** Mirrors `routes/vendor/rfidRoutes.js` + `controllers/vendors/rfidTagController.js`. */
@Controller('v1/vendor/rfid-tag')
@UseGuards(VendorAuthGuard, VendorFeaturesGuard)
@VendorFeatureRequired('RFID')
export class VendorRfidTagController {
  constructor(private readonly rfidTagService: VendorRfidTagService) {}

  private vendorId(req: any): number {
    return Number(req.vendor?.vendorId || req.user?.id || 0);
  }

  private clientId(req: any): number {
    return Number(req.vendor?.clientId || req.user?.clientId || req.headers['x-client-id'] || 0);
  }

  @Post()
  async vendorCreateRfIdTag(@Req() req: any, @Body() dto: CreateRfidTagDto) {
    return this.rfidTagService.createRfidTag(this.vendorId(req), this.clientId(req), dto);
  }

  @Get()
  async getAllRfids(@Req() req: any, @Query('search') search?: string, @Query('page') page?: string, @Query('limit') limit?: string) {
    return this.rfidTagService.getAllRfids(this.vendorId(req), search, Number(page) || 1, Number(limit) || 20);
  }

  @Get(':id')
  async vendorGetRifdTagById(@Req() req: any, @Param('id', ParseIntPipe) id: number) {
    return this.rfidTagService.getRfidTagById(id, this.vendorId(req));
  }

  @Put(':id')
  async vendorUpdateRfIdTag(@Req() req: any, @Param('id', ParseIntPipe) id: number, @Body() dto: UpdateRfidTagDto) {
    return this.rfidTagService.updateRfIdTag(id, this.vendorId(req), dto);
  }

  @Delete(':id')
  @HttpCode(204)
  async vendorDeleteRfIdTag(@Req() req: any, @Param('id', ParseIntPipe) id: number) {
    return this.rfidTagService.deleteRfIdTag(id, this.vendorId(req));
  }
}
