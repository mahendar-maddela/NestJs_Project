import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, Put, Query, Req, UseGuards } from '@nestjs/common';
import { VendorAuthGuard } from '@modules/auth';
import { VendorFleetVehicleService } from '../services/vendor-fleet-vehicle.service';
import { CreateFleetVehicleDto, UpdateFleetVehicleDto, ToggleAutoChargeDto } from '../dto/admin-fleet-vehicle.dto';

/** Mirrors `routes/vendor/fleet/vehicleRoutes.js` + `controllers/vendors/Fleet/vehicleController.js`. */
@Controller('v1/vendor/fleet/vehicle')
@UseGuards(VendorAuthGuard)
export class VendorFleetVehicleController {
  constructor(private readonly vehicleService: VendorFleetVehicleService) {}

  private clientId(req: any): number {
    return Number(req.vendor?.clientId || req.user?.clientId || req.headers['x-client-id'] || 0);
  }

  @Get('brand')
  async getAllBrands() {
    return this.vehicleService.getAllBrands();
  }

  @Get('single/:vehicleId')
  async cpoGetVehicleById(@Req() req: any, @Param('vehicleId', ParseIntPipe) vehicleId: number) {
    return this.vehicleService.cpoGetVehicleById(vehicleId, this.clientId(req));
  }

  @Get('model/capacity/:modelId')
  async getAllCapacities(@Param('modelId', ParseIntPipe) modelId: number) {
    return this.vehicleService.getAllCapacities(modelId);
  }

  @Get('model/:brandId')
  async getAllModels(@Param('brandId', ParseIntPipe) brandId: number) {
    return this.vehicleService.getAllModels(brandId);
  }

  @Get(':groupId')
  async getCpoFleetAllVehicles(@Req() req: any, @Param('groupId', ParseIntPipe) groupId: number, @Query('page') page?: string, @Query('limit') limit?: string) {
    return this.vehicleService.getCpoFleetAllVehicles(groupId, this.clientId(req), Number(page) || 1, Number(limit) || 20);
  }

  @Post()
  async cpoCreateVehicle(@Req() req: any, @Body() dto: CreateFleetVehicleDto) {
    return this.vehicleService.cpoCreateVehicle(this.clientId(req), dto);
  }

  @Patch(':vehicleId')
  async cpoAutoChargetoggleSwitchController(@Req() req: any, @Param('vehicleId', ParseIntPipe) vehicleId: number, @Body() dto: ToggleAutoChargeDto) {
    return this.vehicleService.cpoAutoChargetoggleSwitch(vehicleId, this.clientId(req), dto);
  }

  @Put(':vehicleId')
  async cpoUpdateVehicle(@Req() req: any, @Param('vehicleId', ParseIntPipe) vehicleId: number, @Body() dto: UpdateFleetVehicleDto) {
    return this.vehicleService.cpoUpdateVehicle(vehicleId, this.clientId(req), dto);
  }
}
