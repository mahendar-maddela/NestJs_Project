import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Put, Query, Req, UseGuards } from '@nestjs/common';
import { FleetAuthGuard } from '@modules/auth';
import { FleetVehicleService } from '../services/fleet-vehicle.service';
import { CreateFleetVehicleDto, UpdateFleetVehicleDto, FleetToggleAutoChargeDto } from '../dto/fleet-vehicle.dto';

/** Mirrors `routes/Fleet/vehicleRoutes.js`. Route order matches legacy exactly (`brand`/`model/:brandId`/`capacity/:modelId` before `:id`). */
@Controller('v1/fleet/vehicle')
@UseGuards(FleetAuthGuard)
export class FleetVehicleController {
  constructor(private readonly vehicleService: FleetVehicleService) {}

  private fleetId(req: any): number {
    return Number(req.user.fleetId);
  }

  private clientId(req: any): number {
    return Number(req.user.clientId);
  }

  @Post()
  async createVehicle(@Req() req: any, @Body() dto: CreateFleetVehicleDto) {
    return this.vehicleService.createVehicle(this.fleetId(req), this.clientId(req), dto);
  }

  @Get()
  async getAllVehicles(@Req() req: any, @Query('page') page?: string, @Query('limit') limit?: string, @Query('search') search?: string) {
    const pageNum = page ? Number(page) : undefined;
    const limitNum = limit ? Number(limit) : undefined;
    return this.vehicleService.getAllVehicles(this.fleetId(req), this.clientId(req), pageNum, limitNum, search);
  }

  @Get('brand')
  async getAllBrands() {
    return this.vehicleService.getAllBrands();
  }

  @Get('model/:brandId')
  async getAllModelsByBrandId(@Param('brandId', ParseIntPipe) brandId: number) {
    return this.vehicleService.getAllModelsByBrandId(brandId);
  }

  @Get('capacity/:modelId')
  async getAllCapacities(@Param('modelId', ParseIntPipe) modelId: number) {
    return this.vehicleService.getAllCapacities(modelId);
  }

  @Get(':id')
  async getVehicleById(@Req() req: any, @Param('id', ParseIntPipe) id: number) {
    return this.vehicleService.getVehicleById(id, this.clientId(req));
  }

  @Put(':id')
  async updateVehicle(@Req() req: any, @Param('id', ParseIntPipe) id: number, @Body() dto: UpdateFleetVehicleDto) {
    return this.vehicleService.updateVehicle(id, this.clientId(req), dto);
  }

  @Delete(':id')
  async deleteVehicle(@Req() req: any, @Param('id', ParseIntPipe) id: number) {
    return this.vehicleService.deleteVehicle(id, this.clientId(req));
  }

  @Patch(':id')
  async autoChargeEnbleAndDisable(@Req() req: any, @Param('id', ParseIntPipe) id: number, @Body() dto: FleetToggleAutoChargeDto) {
    return this.vehicleService.autoChargeEnbleAndDisable(id, this.clientId(req), dto);
  }

  @Get('history/:vehicleId')
  async vehicleHistoryData(@Req() req: any, @Param('vehicleId', ParseIntPipe) vehicleId: number) {
    return this.vehicleService.vehicleHistoryData(vehicleId, this.clientId(req));
  }
}
