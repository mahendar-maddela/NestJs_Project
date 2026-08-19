import { Controller, Get, Post, Put, Delete, Param, Body, ParseIntPipe, UseGuards } from '@nestjs/common';
import { AdminConnectorService } from '../services/admin-connector.service';
import { AdminAuthGuard } from '@modules/auth';
import { CreateConnectorDto, UpdateConnectorDto } from '../dto/admin-connector.dto';

@Controller('v1/admin/connector')
@UseGuards(AdminAuthGuard)
export class AdminConnectorController {
  constructor(private readonly adminConnectorService: AdminConnectorService) {}

  @Post()
  async createConnector(@Body() dto: CreateConnectorDto) {
    return this.adminConnectorService.createConnector(dto);
  }

  @Get()
  async getAllConnectors() {
    return this.adminConnectorService.getAllConnectors();
  }

  @Get(':id')
  async getConnectorById(@Param('id', ParseIntPipe) id: number) {
    return this.adminConnectorService.getConnectorById(id);
  }

  @Put(':id')
  async updateConnector(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateConnectorDto) {
    return this.adminConnectorService.updateConnector(id, dto);
  }

  @Delete(':id')
  async deleteConnector(@Param('id', ParseIntPipe) id: number) {
    return this.adminConnectorService.deleteConnector(id);
  }
}
