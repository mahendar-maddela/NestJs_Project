import { Controller, Get, Post, Put, Body, Param, Query, ParseIntPipe, UseGuards } from '@nestjs/common';
import { EmployeeService } from '../services/employee.service';
import { CreateEmployeeDto, UpdateEmployeeDto, EmployeeQueryDto } from '../dto/employee.dto';
import { SuperAdminAuthGuard } from '@modules/auth';

@Controller('v1/super-admin/employee')
@UseGuards(SuperAdminAuthGuard)
export class SuperAdminEmployeeController {
  constructor(private readonly employeeService: EmployeeService) { }

  @Get()
  async getAllEmployees(@Query() query: EmployeeQueryDto) {
    return this.employeeService.getAllEmployees(query);
  }

  @Get(':id')
  async getEmployeeById(@Param('id', ParseIntPipe) id: number) {
    return this.employeeService.getEmployeeById(id);
  }

  @Post()
  async createEmployee(@Body() body: CreateEmployeeDto) {
    return this.employeeService.createEmployee(body);
  }

  @Put(':id')
  async updateEmployee(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: UpdateEmployeeDto,
  ) {
    return this.employeeService.updateEmployee(id, body);
  }
}
