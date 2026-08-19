import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ChargerConfiguration } from '../entities/charger-configuration.entity';
import { LogConfiguration } from '../entities/log-configuration.entity';

@Injectable()
export class AdminOcppRepository {
  constructor(
    @InjectRepository(ChargerConfiguration) private readonly chargerConfigRepo: Repository<ChargerConfiguration>,
    @InjectRepository(LogConfiguration) private readonly logConfigRepo: Repository<LogConfiguration>,
  ) {}

  findAllChargerConfiguration(chargerRef: string) {
    return this.chargerConfigRepo.find({ where: { chargerRef: chargerRef as any } });
  }

  findAllLogConfig(chargerRef: string) {
    return this.logConfigRepo.find({ where: { chargerRef: chargerRef as any } });
  }

  async updateChargerConfigurationValue(chargerId: string, configName: string, configValue: string) {
    await this.chargerConfigRepo.update({ chargerId, configName }, { configValue });
  }
}
