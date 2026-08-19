import { Controller, Get, Post, Put, Delete, Param, Body, ParseIntPipe, UseGuards } from '@nestjs/common';
import { AdminBrandService } from '../services/admin-brand.service';
import { AdminAuthGuard, StaffPermissionsGuard, StaffPermission } from '@modules/auth';
import { CreateBrandDto, UpdateBrandDto } from '../dto/brand.dto';

@Controller('v1/admin/brand')
@UseGuards(AdminAuthGuard, StaffPermissionsGuard)
export class AdminBrandController {
  constructor(private readonly adminBrandService: AdminBrandService) {}

  @Post()
  @StaffPermission('Vehicle_Management')
  async createBrand(@Body() dto: CreateBrandDto) {
    return this.adminBrandService.createBrand(dto);
  }

  @Get()
  @StaffPermission('Vehicle_Management')
  async getAllBrands() {
    return this.adminBrandService.getAllBrands();
  }

  @Get(':id')
  @StaffPermission('Vehicle_Management')
  async getBrandById(@Param('id', ParseIntPipe) id: number) {
    return this.adminBrandService.getBrandById(id);
  }

  @Put(':id')
  @StaffPermission('Vehicle_Management')
  async updateBrand(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateBrandDto) {
    return this.adminBrandService.updateBrand(id, dto);
  }

  @Delete(':id')
  @StaffPermission('Vehicle_Management')
  async deleteBrand(@Param('id', ParseIntPipe) id: number) {
    return this.adminBrandService.deleteBrand(id);
  }
}
