import { Controller, Get, Param, ParseIntPipe, Query, UseGuards } from '@nestjs/common';
import { SuperAdminAuthGuard } from '@modules/auth';
import { SuperAdminVendorService } from '../services/super-admin-vendor.service';
import { SuperAdminVendorQueryDto } from '../dto/super-admin-vendor.dto';

/** Mirrors `routes/SuperAdmin/vendorRoutes.js` + `controllers/suparAdmin/vendorController.js`. */
@Controller('v1/super-admin/cpo')
@UseGuards(SuperAdminAuthGuard)
export class SuperAdminVendorController {
  constructor(private readonly vendorService: SuperAdminVendorService) {}

  @Get()
  async getAllClientsVendors(@Query() query: SuperAdminVendorQueryDto) {
    return this.vendorService.getAllClientsVendors(query);
  }

  @Get(':vendorId')
  async getClientVendorById(@Param('vendorId', ParseIntPipe) vendorId: number) {
    return this.vendorService.getClientVendorById(vendorId);
  }
}
