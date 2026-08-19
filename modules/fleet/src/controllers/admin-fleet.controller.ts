import { Controller, Get, Param, Query, ParseIntPipe } from '@nestjs/common';
import { FleetService } from '../services/fleet.service';

@Controller('v1/admin/fleet')
export class AdminFleetController {
  constructor(private readonly fleetService: FleetService) {}

  @Get()
  async findAll(@Query('skip') skip?: number, @Query('take') take?: number) {
    return this.fleetService.getAllFleetUsers(skip ? +skip : 0, take ? +take : 10);
  }

  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return this.fleetService.getFleetUserById(id);
  }
}
