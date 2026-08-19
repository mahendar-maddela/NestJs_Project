import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Vehicle } from '../../../users/src/entities/vehicle.entity';
import { FleetUser } from '../entities/fleet-user.entity';
import { Wallet } from '../../../wallet/src/entities/wallet.entity';
import { WalletTransaction } from '../../../wallet/src/entities/wallet-transaction.entity';
import { Tariff } from '../../../tariffs/src/entities/tariff.entity';
import { FleetDriverVehicle } from '../entities/fleet-driver-vehicle.entity';

/** Mirrors `controllers/Fleet/DashboardController.js`. */
@Injectable()
export class FleetDashboardRepository {
  constructor(
    @InjectRepository(Vehicle) private readonly vehicleRepo: Repository<Vehicle>,
    @InjectRepository(FleetUser) private readonly fleetUserRepo: Repository<FleetUser>,
    @InjectRepository(Wallet) private readonly walletRepo: Repository<Wallet>,
    @InjectRepository(WalletTransaction) private readonly walletTransactionRepo: Repository<WalletTransaction>,
    @InjectRepository(Tariff) private readonly tariffRepo: Repository<Tariff>,
    @InjectRepository(FleetDriverVehicle) private readonly fleetDriverVehicleRepo: Repository<FleetDriverVehicle>,
  ) {}

  countVehiclesByFleet(fleetId: number) {
    return this.vehicleRepo.count({ where: { fleetId } });
  }

  countDriversByFleetClient(fleetId: number, clientId: number) {
    return this.fleetUserRepo.count({ where: { fleetId, type: 'DRIVER', clientId } });
  }

  findFleetWallet(fleetId: number) {
    return this.walletRepo.findOne({ where: { fleetId, type: 'Fleet' }, select: { id: true, balance: true, type: true } });
  }

  countSpecialPriceChargersByFleet(fleetId: number) {
    return this.tariffRepo
      .createQueryBuilder('t')
      .innerJoin('t.userType', 'userType')
      .innerJoin('userType.vendorUsers', 'vendorUsers')
      .innerJoin('vendorUsers.fleetGroup', 'fleetGroup', 'fleetGroup.fleetId = :fleetId', { fleetId })
      .getCount();
  }

  async findAndCountWalletTransactions(walletId: number, skip: number) {
    return this.walletTransactionRepo.findAndCount({
      where: { walletId },
      order: { createdAt: 'DESC' },
      skip,
      take: 5,
    });
  }

  findActiveDashboardAssignments(fleetId: number, clientId: number, today: string, currentTime: string) {
    return this.fleetDriverVehicleRepo
      .createQueryBuilder('fdv')
      .innerJoinAndSelect('fdv.vehicle', 'vehicle', 'vehicle.fleetId = :fleetId AND vehicle.clientId = :clientId', { fleetId, clientId })
      .innerJoinAndSelect('fdv.fleetDriver', 'fleetDriver', 'fleetDriver.fleetId = :fleetId2 AND fleetDriver.clientId = :clientId2', {
        fleetId2: fleetId,
        clientId2: clientId,
      })
      .where('fdv.status = :status', { status: 'Assigned' })
      .andWhere('fdv.startDate <= :today', { today })
      .andWhere('fdv.startTime <= :currentTime', { currentTime })
      .andWhere('fdv.endTime >= :currentTime', { currentTime })
      .orderBy('fdv.createdAt', 'DESC')
      .take(5)
      .getMany();
  }
}
