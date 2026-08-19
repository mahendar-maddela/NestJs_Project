import { Controller, Get, UseGuards } from '@nestjs/common';
import { VendorAuthGuard } from '@modules/auth';
import { VendorService } from '../services/vendor.service';

/** Mirrors `routes/vendor/permissionRoutes.js` + `controllers/vendors/permissionController.js`. */
@Controller('v1/vendor/permission')
@UseGuards(VendorAuthGuard)
export class VendorPermissionController {
  constructor(private readonly vendorService: VendorService) {}

  @Get()
  async getAllPermissions() {
    return this.vendorService.getVendorPermissions();
  }
}
