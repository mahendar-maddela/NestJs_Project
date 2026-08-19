import { Body, Controller, Delete, Get, Param, ParseIntPipe, Post, Put, Req, UseGuards } from '@nestjs/common';
import { FleetAuthGuard } from '@modules/auth';
import { FleetRfidService } from '../services/fleet-rfid.service';
import { CreateFleetRfidTagDto, UpdateFleetRfidTagDto } from '../dto/fleet-rfid.dto';

/** Mirrors `routes/Fleet/rfIdRoutee.js`. */
@Controller('v1/fleet/rfid')
@UseGuards(FleetAuthGuard)
export class FleetRfidController {
  constructor(private readonly rfidService: FleetRfidService) {}

  private fleetId(req: any): number {
    return Number(req.user.fleetId);
  }

  private clientId(req: any): number {
    return Number(req.user.clientId);
  }

  @Post()
  async createRfidTag(@Req() req: any, @Body() dto: CreateFleetRfidTagDto) {
    return this.rfidService.createRfidTag(this.fleetId(req), this.clientId(req), dto);
  }

  @Get(':groupId')
  async getAllRFIdById(@Req() req: any, @Param('groupId', ParseIntPipe) groupId: number) {
    return this.rfidService.getAllRFIdById(groupId, this.fleetId(req), this.clientId(req));
  }

  @Put(':id')
  async editRfIdTag(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateFleetRfidTagDto) {
    return this.rfidService.editRfIdTag(id, dto);
  }

  @Delete(':id')
  async deleteRfIdTag(@Req() req: any, @Param('id', ParseIntPipe) id: number) {
    return this.rfidService.deleteRfIdTag(id, this.fleetId(req), this.clientId(req));
  }
}
