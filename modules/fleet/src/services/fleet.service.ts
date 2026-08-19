import { Injectable, NotFoundException } from '@nestjs/common';
import { FleetRepository } from '../repositories/fleet.repository';

@Injectable()
export class FleetService {
  constructor(private readonly fleetRepository: FleetRepository) {}

  async getFleetUserById(id: number) {
    const fleetUser = await this.fleetRepository.findById(id);
    if (!fleetUser) {
      throw new NotFoundException(`Fleet user with ID ${id} not found`);
    }
    return fleetUser;
  }

  async getAllFleetUsers(skip = 0, take = 10) {
    return this.fleetRepository.findAll({ skip, take });
  }
}
