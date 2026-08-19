import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  Req,
  ParseIntPipe,
} from '@nestjs/common';
import { AdminAmenityService } from '../services/admin-amenity.service';
import { AdminAuthGuard } from '@modules/auth';

@Controller('v1/admin/amenity')
@UseGuards(AdminAuthGuard)
export class AdminAmenityController {
  constructor(private readonly adminAmenityService: AdminAmenityService) {}

  @Post()
  async createAmenity(@Req() req: any, @Body() body: any) {
    const file = req.file || (req.files ? req.files['file']?.[0] || req.files[0] : undefined);
    return this.adminAmenityService.createAmenity(body, file);
  }

  @Get()
  async getAllAmenities(@Query() query: any) {
    return this.adminAmenityService.getAllAmenities(query);
  }

  @Get(':id')
  async getAmenityById(@Param('id', ParseIntPipe) id: number) {
    return this.adminAmenityService.getAmenityById(id);
  }

  @Put(':id')
  async updateAmenity(@Req() req: any, @Param('id', ParseIntPipe) id: number, @Body() body: any) {
    const file = req.file || (req.files ? req.files['file']?.[0] || req.files[0] : undefined);
    return this.adminAmenityService.updateAmenity(id, body, file);
  }

  @Delete(':id')
  async deleteAmenity(@Param('id', ParseIntPipe) id: number) {
    return this.adminAmenityService.deleteAmenity(id);
  }
}
