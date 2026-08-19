import { Injectable } from '@nestjs/common';
import { StationRepository } from '../repositories/station.repository';

@Injectable()
export class StationService {
  constructor(private readonly stationRepository: StationRepository) {}

  async getStationById(id: number) {
    return this.stationRepository.findById(id);
  }
}
