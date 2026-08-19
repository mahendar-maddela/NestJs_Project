import { Controller, Get, Post, Put, Patch, Delete, Param, Body, ParseIntPipe, UseGuards } from '@nestjs/common';
import { AdminVehicleModelService } from '../services/admin-vehicle-model.service';
import { AdminAuthGuard, StaffPermissionsGuard, StaffPermission } from '@modules/auth';
import { CreateVehicleModelDto, UpdateVehicleModelDto, UpdateVehicleModelStatusDto } from '../dto/vehicle-model.dto';

@Controller('v1/admin/model')
@UseGuards(AdminAuthGuard, StaffPermissionsGuard)
export class AdminVehicleModelController {
  constructor(private readonly adminVehicleModelService: AdminVehicleModelService) {}

  @Get('capacity/:modelId')
  @StaffPermission('Vehicle_Management')
  async getAllCapacities(@Param('modelId', ParseIntPipe) modelId: number) {
    return this.adminVehicleModelService.getAllCapacities(modelId);
  }

  @Post()
  @StaffPermission('Vehicle_Management')
  async createModel(@Body() dto: CreateVehicleModelDto) {
    return this.adminVehicleModelService.createModel(dto);
  }

  @Get()
  @StaffPermission('Vehicle_Management')
  async getAllModels() {
    return this.adminVehicleModelService.getAllModels();
  }

  @Get(':id')
  @StaffPermission('Vehicle_Management')
  async getModelById(@Param('id', ParseIntPipe) id: number) {
    return this.adminVehicleModelService.getModelById(id);
  }

  @Put(':id')
  @StaffPermission('Vehicle_Management')
  async updateModel(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateVehicleModelDto) {
    return this.adminVehicleModelService.updateModel(id, dto);
  }

  @Delete(':id')
  @StaffPermission('Vehicle_Management')
  async deleteModel(@Param('id', ParseIntPipe) id: number) {
    return this.adminVehicleModelService.deleteModel(id);
  }

  @Patch(':id')
  @StaffPermission('Vehicle_Management')
  async updateStatus(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateVehicleModelStatusDto) {
    return this.adminVehicleModelService.updateStatus(id, dto);
  }
}
