import { Injectable } from '@nestjs/common';
import { ReportsRepository } from '../repositories/reports.repository';

@Injectable()
export class ReportsService {
  constructor(private readonly reportsRepository: ReportsRepository) {}

  async getRevenueReport() {
    return this.reportsRepository.generateRevenueReport();
  }
}
