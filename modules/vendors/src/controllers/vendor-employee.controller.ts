import { Body, Controller, Delete, Get, Param, ParseIntPipe, Post, Put, Req, UseGuards } from '@nestjs/common';
import { VendorAuthGuard } from '@modules/auth';
import { VendorEmployeeService } from '../services/vendor-employee.service';
import { CreateVendorEmployeeDto, UpdateVendorEmployeeDto, AssignIndividualPermissionsDto } from '../dto/vendor-employee.dto';

/** Mirrors `routes/vendor/employeeRoutes.js` + `controllers/vendors/employeeController.js`. */
@Controller('v1/vendor/employee')
@UseGuards(VendorAuthGuard)
export class VendorEmployeeController {
  constructor(private readonly employeeService: VendorEmployeeService) {}

  private vendorId(req: any): number {
    return Number(req.vendor?.vendorId || req.user?.id || 0);
  }

  private clientId(req: any): number {
    return Number(req.vendor?.clientId || req.user?.clientId || req.headers['x-client-id'] || 0);
  }

  @Post()
  async createEmployee(@Req() req: any, @Body() dto: CreateVendorEmployeeDto) {
    return this.employeeService.createEmployee(this.vendorId(req), this.clientId(req), dto);
  }

  @Get()
  async getAllEmployees(@Req() req: any) {
    return this.employeeService.getAllEmployees(this.vendorId(req));
  }

  @Post('assain-permissions/:id')
  async individualPermissionsToUser(@Param('id', ParseIntPipe) id: number, @Body() dto: AssignIndividualPermissionsDto) {
    return this.employeeService.individualPermissionsToUser(id, dto);
  }

  @Get('permissions/:id')
  async getAllVendorPermissions(@Param('id', ParseIntPipe) id: number) {
    return this.employeeService.getAllVendorPermissions(id);
  }

  @Get(':id')
  async getEmployeeById(@Req() req: any, @Param('id', ParseIntPipe) id: number) {
    return this.employeeService.getEmployeeById(id, this.clientId(req));
  }

  @Put(':id')
  async updateEmployee(@Req() req: any, @Param('id', ParseIntPipe) id: number, @Body() dto: UpdateVendorEmployeeDto) {
    return this.employeeService.updateEmployee(id, this.clientId(req), dto);
  }

  @Delete(':id')
  async deleteEmployee(@Req() req: any, @Param('id', ParseIntPipe) id: number) {
    return this.employeeService.deleteEmployee(id, this.clientId(req));
  }
}
