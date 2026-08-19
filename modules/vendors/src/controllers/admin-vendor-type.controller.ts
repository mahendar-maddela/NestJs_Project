import { Controller, Get, Post, Put, Delete, Param, Body, ParseIntPipe, UseGuards } from '@nestjs/common';
import { AdminVendorTypeService } from '../services/admin-vendor-type.service';
import { AdminAuthGuard } from '@modules/auth';
import { CreateVendorTypeDto, UpdateVendorTypeDto } from '../dto/admin-vendor-type.dto';

@Controller('v1/admin/vendor-type')
@UseGuards(AdminAuthGuard)
export class AdminVendorTypeController {
  constructor(private readonly adminVendorTypeService: AdminVendorTypeService) {}

  @Post()
  async createVendorType(@Body() dto: CreateVendorTypeDto) {
    return this.adminVendorTypeService.createVendorType(dto);
  }

  @Get()
  async getAllVendorTypes() {
    return this.adminVendorTypeService.getAllVendorTypes();
  }

  @Get(':id')
  async getVendorTypeById(@Param('id', ParseIntPipe) id: number) {
    return this.adminVendorTypeService.getVendorTypeById(id);
  }

  @Put(':id')
  async updateVendorType(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateVendorTypeDto) {
    return this.adminVendorTypeService.updateVendorType(id, dto);
  }

  @Delete(':id')
  async deleteVendorType(@Param('id', ParseIntPipe) id: number) {
    return this.adminVendorTypeService.deleteVendorType(id);
  }
}
