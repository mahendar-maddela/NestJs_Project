import { Controller, Get, UseGuards } from '@nestjs/common';
import { VendorAuthGuard } from '@modules/auth';
import { VendorService } from '../services/vendor.service';

/** Mirrors `routes/vendor/amenityRoutes.js` + `controllers/vendors/amenityController.js`. */
@Controller('v1/vendor/amenity')
@UseGuards(VendorAuthGuard)
export class VendorAmenityController {
  constructor(private readonly vendorService: VendorService) {}

  @Get()
  async getAllAmenities() {
    return this.vendorService.getActiveAmenities();
  }
}
