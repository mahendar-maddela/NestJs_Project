import { Body, Controller, Get, Param, ParseIntPipe, Post, Put, Query, Req, UseGuards } from '@nestjs/common';
import { VendorAuthGuard } from '@modules/auth';
import { VendorFleetUserService } from '../services/vendor-fleet-user.service';
import { CreateVendorFleetUserDto, UpdateVendorFleetUserDto } from '../dto/vendor-fleet-user.dto';

/** Mirrors `routes/vendor/fleet/fleetUserRoutes.js` + `controllers/vendors/Fleet/fleetUserController.js`. */
@Controller('v1/vendor/fleet/user')
@UseGuards(VendorAuthGuard)
export class VendorFleetUserController {
  constructor(private readonly fleetUserService: VendorFleetUserService) {}

  private vendorId(req: any): number {
    return Number(req.vendor?.vendorId || req.user?.id || 0);
  }

  private clientId(req: any): number {
    return Number(req.vendor?.clientId || req.user?.clientId || req.headers['x-client-id'] || 0);
  }

  @Get()
  async getAllFleetUsers(@Req() req: any, @Query('search') search?: string, @Query('page') page?: string, @Query('limit') limit?: string) {
    return this.fleetUserService.getAllFleetUsers(this.vendorId(req), this.clientId(req), search, page ? Number(page) : null, limit ? Number(limit) : null);
  }

  @Get('count')
  async fleetCardCounts(@Req() req: any) {
    return this.fleetUserService.fleetCardCounts(this.vendorId(req), this.clientId(req));
  }

  @Get(':fleetId')
  async getFleetUserDetailsById(@Req() req: any, @Param('fleetId', ParseIntPipe) fleetId: number) {
    return this.fleetUserService.getFleetUserDetailsById(fleetId, this.vendorId(req), this.clientId(req));
  }

  @Post()
  async createFleetUser(@Req() req: any, @Body() dto: CreateVendorFleetUserDto) {
    return this.fleetUserService.createFleetUser(this.vendorId(req), this.clientId(req), dto);
  }

  @Put(':fleetUserId')
  async updateFleetUser(@Req() req: any, @Param('fleetUserId', ParseIntPipe) fleetUserId: number, @Body() dto: UpdateVendorFleetUserDto) {
    return this.fleetUserService.updateFleetUser(fleetUserId, this.clientId(req), dto);
  }
}
