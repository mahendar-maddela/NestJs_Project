import { Injectable, NotFoundException } from '@nestjs/common';
import { ChargerRepository } from '../repositories/charger.repository';

@Injectable()
export class ChargerService {
  constructor(private readonly chargerRepository: ChargerRepository) {}

  async getChargerById(id: number) {
    const charger = await this.chargerRepository.findById(id);
    if (!charger) {
      throw new NotFoundException(`Charger with ID ${id} not found`);
    }
    return charger;
  }

  async getAllChargers(skip = 0, take = 10) {
    return this.chargerRepository.findAll({ skip, take });
  }

  async createCharger(data: any) {
    return this.chargerRepository.create(data);
  }

  async updateCharger(id: number, data: any) {
    return this.chargerRepository.update(id, data);
  }
}
