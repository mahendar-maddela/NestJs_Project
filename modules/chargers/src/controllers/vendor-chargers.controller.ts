import { Controller, Get, Param, Query, ParseIntPipe } from '@nestjs/common';
import { ChargerService } from '../services/charger.service';

@Controller('v1/vendor/chargers')
export class VendorChargersController {
  constructor(private readonly chargerService: ChargerService) {}

  @Get()
  async findAll(@Query('skip') skip?: number, @Query('take') take?: number) {
    return this.chargerService.getAllChargers(skip ? +skip : 0, take ? +take : 10);
  }

  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return this.chargerService.getChargerById(id);
  }
}
