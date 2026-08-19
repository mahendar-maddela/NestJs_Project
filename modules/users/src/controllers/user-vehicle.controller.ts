import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Put, Query, Req, UseGuards } from '@nestjs/common';
import { VehicleService } from '../services/vehicle.service';
import { UserAuthGuard } from '@modules/auth';
import { AutoChargeToggleDto, CreateVehicleDto, UpdateVehicleDto } from '../dto/vehicle.dto';

function currentClientId(req: any): number {
  return Number(req.client?.clientId || req.user?.clientId || req.headers['x-client-id'] || 1);
}

/** Driver vehicle management. Mirrors legacy `controllers/APP/vehicleController.js` (`v1/vehicle/*`). */
@Controller('v1/vehicle')
@UseGuards(UserAuthGuard)
export class UserVehicleController {
  constructor(private readonly vehicleService: VehicleService) {}

  @Post()
  async create(@Req() req: any, @Query('type') type: string, @Body() dto: CreateVehicleDto) {
    return this.vehicleService.create(req.user.id, currentClientId(req), dto, type === 'Charging');
  }

  @Get()
  async findAll(@Req() req: any) {
    return this.vehicleService.findAll(req.user.id, currentClientId(req));
  }

  @Get('brand')
  async getAllBrands() {
    return this.vehicleService.getAllBrands();
  }

  @Get('model/:brandId')
  async getModelsByBrand(@Param('brandId', ParseIntPipe) brandId: number) {
    return this.vehicleService.getModelsByBrand(brandId);
  }

  @Get('capacity/:modelId')
  async getCapacitiesByModel(@Param('modelId', ParseIntPipe) modelId: number) {
    return this.vehicleService.getCapacitiesByModel(modelId);
  }

  @Get(':id')
  async findOne(@Req() req: any, @Param('id', ParseIntPipe) id: number) {
    return this.vehicleService.findById(id, currentClientId(req));
  }

  @Put(':id')
  async update(@Req() req: any, @Param('id', ParseIntPipe) id: number, @Query('type') type: string, @Body() dto: UpdateVehicleDto) {
    return this.vehicleService.update(id, currentClientId(req), dto, type === 'Charging');
  }

  @Delete(':id')
  async remove(@Req() req: any, @Param('id', ParseIntPipe) id: number) {
    return this.vehicleService.delete(id, currentClientId(req));
  }

  @Patch('primary/:vehicleId')
  async updateAsPrimary(@Req() req: any, @Param('vehicleId', ParseIntPipe) vehicleId: number) {
    return this.vehicleService.updateAsPrimary(vehicleId, req.user.id, currentClientId(req));
  }

  @Patch(':id')
  async toggleAutoCharge(@Req() req: any, @Param('id', ParseIntPipe) id: number, @Body() dto: AutoChargeToggleDto) {
    return this.vehicleService.toggleAutoCharge(id, currentClientId(req), dto);
  }
}
