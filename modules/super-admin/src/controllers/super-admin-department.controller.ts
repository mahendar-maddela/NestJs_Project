import { Controller, Get, Post, Put, Body, Param, Query, ParseIntPipe, UseGuards, Req } from '@nestjs/common';
import { DepartmentService } from '../services/department.service';
import { CreateDepartmentDto, UpdateDepartmentDto, DepartmentQueryDto } from '../dto/department.dto';
import { SuperAdminAuthGuard } from '@modules/auth';

@Controller('v1/super-admin/department')
@UseGuards(SuperAdminAuthGuard)
export class SuperAdminDepartmentController {
  constructor(private readonly departmentService: DepartmentService) { }

  @Post()
  async createDepartment(@Body() body: CreateDepartmentDto, @Req() req: any) {
    const superAdminId = req.user?.sub || req.user?.id;
    return this.departmentService.createDepartment(body, superAdminId);
  }

  @Get()
  async getAllDepartments(@Query() query: DepartmentQueryDto) {
    return this.departmentService.getAllDepartments(query);
  }

  @Get(':id')
  async getByIdDepartment(@Param('id', ParseIntPipe) id: number) {
    return this.departmentService.getByIdDepartment(id);
  }

  @Put(':id')
  async updateDepartment(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: UpdateDepartmentDto,
  ) {
    return this.departmentService.updateDepartment(id, body);
  }
}
