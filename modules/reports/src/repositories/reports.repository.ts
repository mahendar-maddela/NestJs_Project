import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MonthlyAnalytics } from '../entities/monthly-analytics.entity';

@Injectable()
export class ReportsRepository {
  constructor(
    @InjectRepository(MonthlyAnalytics)
    private readonly analyticsRepo: Repository<MonthlyAnalytics>,
  ) {}

  async generateRevenueReport() {
    return { revenue: 0, currency: 'INR' };
  }
}
