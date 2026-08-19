import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PaymentTransaction } from '../entities/payment-transaction.entity';

@Injectable()
export class AdminPaymentTransactionsRepository {
  constructor(
    @InjectRepository(PaymentTransaction)
    private readonly paymentTransactionRepo: Repository<PaymentTransaction>,
  ) {}

  async findAndCountAll(where: Record<string, unknown>, skip: number, limit: number) {
    const [rows, count] = await this.paymentTransactionRepo.findAndCount({
      where: where as any,
      skip,
      take: limit,
      relations: { user: true, fleetUserDetail: true },
      order: { id: 'DESC' },
    });
    return { count, rows };
  }

  async findAllForDownload(where: Record<string, unknown>) {
    return this.paymentTransactionRepo.find({
      where: where as any,
      relations: { user: true, fleetUserDetail: true },
      order: { id: 'DESC' },
    });
  }
}
