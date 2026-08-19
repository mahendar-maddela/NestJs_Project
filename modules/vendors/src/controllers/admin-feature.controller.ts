import { Controller, Get, Post, Put, Delete, Param, Body, ParseIntPipe, UseGuards, Req } from '@nestjs/common';
import { AdminFeatureService } from '../services/admin-feature.service';
import { AdminAuthGuard } from '@modules/auth';
import { CreateFeatureDto, UpdateFeatureDto } from '../dto/admin-feature.dto';

@Controller('v1/admin/feature')
@UseGuards(AdminAuthGuard)
export class AdminFeatureController {
  constructor(private readonly adminFeatureService: AdminFeatureService) {}

  @Post()
  async createFeature(@Body() dto: CreateFeatureDto) {
    return this.adminFeatureService.createFeature(dto);
  }

  @Get()
  async getAllFeatures(@Req() req: any) {
    const clientId = Number(req.client?.clientId || req.user?.clientId || req.headers['x-client-id'] || 0);
    return this.adminFeatureService.getAllFeatures(clientId);
  }

  @Get(':id')
  async getFeatureById(@Param('id', ParseIntPipe) id: number) {
    return this.adminFeatureService.getFeatureById(id);
  }

  @Put(':id')
  async updateFeature(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateFeatureDto) {
    return this.adminFeatureService.updateFeature(id, dto);
  }

  @Delete(':id')
  async deleteFeature(@Param('id', ParseIntPipe) id: number) {
    return this.adminFeatureService.deleteFeature(id);
  }
}
