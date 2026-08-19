import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  Req,
  ParseIntPipe,
} from '@nestjs/common';
import { AdminVendorService } from '../services/admin-vendor.service';
import { AdminAuthGuard } from '@modules/auth';

@Controller('v1/admin/vendor')
@UseGuards(AdminAuthGuard)
export class AdminVendorController {
  constructor(private readonly adminVendorService: AdminVendorService) {}

  @Post()
  async createVendor(@Req() req: any, @Body() body: any) {
    const staffId = req.user?.id || req.user?.sub;
    const clientId = Number(req.client?.clientId || req.user?.clientId || req.headers['x-client-id']);
    return this.adminVendorService.createVendor(body, staffId, clientId);
  }

  @Get()
  async getAllVendors(@Req() req: any, @Query() query: any) {
    const clientId = Number(req.client?.clientId || req.user?.clientId || req.headers['x-client-id']);
    return this.adminVendorService.getAllVendors(query, clientId);
  }

  @Get('allvendor/station-chargers')
  async getVendorWithStationsAndChargers(@Req() req: any) {
    const clientId = Number(req.client?.clientId || req.user?.clientId || req.headers['x-client-id']);
    return this.adminVendorService.getVendorWithStationsAndChargers(clientId);
  }

  @Get(':id')
  async getVendorById(@Req() req: any, @Param('id', ParseIntPipe) id: number) {
    const clientId = Number(req.client?.clientId || req.user?.clientId || req.headers['x-client-id']);
    return this.adminVendorService.getVendorById(id, clientId);
  }

  @Put(':id')
  async updateVendor(@Req() req: any, @Param('id', ParseIntPipe) id: number, @Body() body: any) {
    const clientId = Number(req.client?.clientId || req.user?.clientId || req.headers['x-client-id']);
    return this.adminVendorService.updateVendor(id, body, clientId);
  }

  @Delete(':id')
  async deleteVendor(@Param('id', ParseIntPipe) id: number) {
    return this.adminVendorService.deleteVendor(id);
  }

  @Get('station/:id')
  async getVendorStationsById(@Req() req: any, @Param('id', ParseIntPipe) id: number) {
    const clientId = Number(req.client?.clientId || req.user?.clientId || req.headers['x-client-id']);
    return this.adminVendorService.getVendorStationsById(id, clientId);
  }

  @Get('charger/:id')
  async getVendorChargersById(@Param('id', ParseIntPipe) id: number) {
    return this.adminVendorService.getVendorChargersById(id);
  }

  @Get('employee/:id')
  async getVendorEmployeesById(@Param('id', ParseIntPipe) id: number) {
    return this.adminVendorService.getVendorEmployeesById(id);
  }

  @Get('user/:id')
  async getVendorUsersById(@Param('id', ParseIntPipe) id: number, @Query() query: any) {
    return this.adminVendorService.getVendorUsersById(id, query);
  }

  @Get('tariff/:id')
  async getVendorTariffsById(@Param('id', ParseIntPipe) id: number) {
    return this.adminVendorService.getVendorTariffsById(id);
  }

  @Get('wallet-transaction/:id')
  async getVendorWalletTransactions(@Param('id', ParseIntPipe) id: number, @Query() query: any) {
    return this.adminVendorService.getVendorWalletTransactions(id, query);
  }

  @Get('all-stations/:id')
  async getAllVendorStations(@Param('id', ParseIntPipe) id: number) {
    return this.adminVendorService.getAllVendorStations(id);
  }

  @Get('all-tariff/:id')
  async getAllVendorTariffs(@Param('id', ParseIntPipe) id: number) {
    return this.adminVendorService.getAllVendorTariffs(id);
  }

  @Get(':id/count')
  async countsCard(@Req() req: any, @Param('id', ParseIntPipe) id: number) {
    const clientId = Number(req.client?.clientId || req.user?.clientId || req.headers['x-client-id']);
    return this.adminVendorService.countsCard(id, clientId);
  }

  @Patch('status/:id')
  async updateVendorStatus(@Req() req: any, @Param('id', ParseIntPipe) id: number, @Body('status') status: string) {
    const clientId = Number(req.client?.clientId || req.user?.clientId || req.headers['x-client-id']);
    return this.adminVendorService.updateVendorStatus(id, clientId, status);
  }

  /** `:id` is unused (matches legacy `updateVendorPassword`, which resolves the vendor via the reset token instead). */
  @Patch(':id')
  async updateVendorPassword(@Body('password') password: string, @Body('token') token: string) {
    return this.adminVendorService.updateVendorPassword(token, password);
  }
}
