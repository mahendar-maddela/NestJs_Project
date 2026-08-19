import { Body, Controller, Delete, Get, Param, ParseIntPipe, Post, Put, Query, Req, UseGuards } from '@nestjs/common';
import { VendorAuthGuard, VendorFeaturesGuard, VendorFeatureRequired } from '@modules/auth';
import { VendorTariffService } from '../services/vendor-tariff.service';
import { CreateVendorTariffDto, UpdateVendorTariffDto, UpdateStandardChargerTariffDto, AssignVendorUserOrGroupDto } from '../dto/vendor-tariff.dto';

/** Mirrors `routes/vendor/tariffRoutes.js` + `controllers/vendors/tariffController.js`. */
@Controller('v1/vendor/tariff')
@UseGuards(VendorAuthGuard, VendorFeaturesGuard)
@VendorFeatureRequired('Tariff Management')
export class VendorTariffController {
  constructor(private readonly tariffService: VendorTariffService) {}

  private vendorId(req: any): number {
    return Number(req.vendor?.vendorId || req.user?.id || 0);
  }

  private clientId(req: any): number {
    return Number(req.vendor?.clientId || req.user?.clientId || req.headers['x-client-id'] || 0);
  }

  @Post()
  async createTariff(@Req() req: any, @Body() dto: CreateVendorTariffDto) {
    return this.tariffService.createTariff(this.vendorId(req), this.clientId(req), dto);
  }

  @Get()
  async getAllTariffs(@Req() req: any, @Query('search') search?: string, @Query('page') page?: string, @Query('limit') limit?: string) {
    return this.tariffService.getAllTariffs(this.vendorId(req), search, Number(page) || 1, Number(limit) || 200);
  }

  @Get('chargers')
  async getAllChargers(@Req() req: any) {
    return this.tariffService.getAllChargers(this.vendorId(req));
  }

  @Get(':id')
  async getTariffById(@Req() req: any, @Param('id', ParseIntPipe) id: number) {
    return this.tariffService.getTariffById(id, this.vendorId(req));
  }

  @Get('user/:userTypeId')
  async getAllUserVendorUserTypes(@Req() req: any, @Param('userTypeId', ParseIntPipe) userTypeId: number) {
    return this.tariffService.getAllUserVendorUserTypes(userTypeId, this.vendorId(req));
  }

  @Post('user/:userTypeId')
  async createUserVendorUserType(@Req() req: any, @Param('userTypeId', ParseIntPipe) userTypeId: number, @Body() dto: AssignVendorUserOrGroupDto) {
    return this.tariffService.createUserVendorUserType(userTypeId, this.vendorId(req), this.clientId(req), dto);
  }

  @Delete('user/:userTypeId')
  async deleteVendorUser(@Req() req: any, @Param('userTypeId', ParseIntPipe) userTypeId: number) {
    return this.tariffService.deleteVendorUser(userTypeId, this.vendorId(req));
  }

  @Put(':id')
  async updateTariff(@Req() req: any, @Param('id', ParseIntPipe) id: number, @Body() dto: UpdateVendorTariffDto) {
    return this.tariffService.updateTariff(id, this.vendorId(req), this.clientId(req), dto);
  }

  @Delete(':id')
  async deleteTariff(@Req() req: any, @Param('id', ParseIntPipe) id: number) {
    return this.tariffService.deleteTariff(id, this.vendorId(req));
  }

  @Put('standard/:chargerId')
  async updateStandardChargerTariff(@Req() req: any, @Param('chargerId', ParseIntPipe) chargerId: number, @Body() dto: UpdateStandardChargerTariffDto) {
    return this.tariffService.updateStandardChargerTariff(chargerId, this.vendorId(req), dto);
  }
}
