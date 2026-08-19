import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DeviceTransaction } from '../entities/device-transaction.entity';
import { WalletTransaction } from '../../../wallet/src/entities/wallet-transaction.entity';
import { ClientDetails } from '../../../clients/src/entities/client-details.entity';
import { Connector } from '../../../chargers/src/entities/connector.entity';
import { FleetUserDetail } from '../../../fleet/src/entities/fleet-user-detail.entity';

/** Backs the fleet/web/app/OCPI invoice + transaction-summary routes (`getFleetInvoice`, `getInvoice`, `getDeviceTransactionSummary`). */
@Injectable()
export class InvoiceRepository {
  constructor(
    @InjectRepository(DeviceTransaction) private readonly deviceTransactionRepo: Repository<DeviceTransaction>,
    @InjectRepository(WalletTransaction) private readonly walletTransactionRepo: Repository<WalletTransaction>,
    @InjectRepository(ClientDetails) private readonly clientDetailsRepo: Repository<ClientDetails>,
    @InjectRepository(Connector) private readonly connectorRepo: Repository<Connector>,
    @InjectRepository(FleetUserDetail) private readonly fleetUserDetailRepo: Repository<FleetUserDetail>,
  ) {}

  /** Mirrors `controllers/APP/invoiceController.js:getInvoice` / `controllers/Fleet/invoiceController.js:getFleetInvoice`'s `User`/`WalletTransaction` include. */
  async findByIdWithUser(id: number): Promise<any> {
    const transaction = await this.deviceTransactionRepo.findOne({ where: { id }, relations: { user: true } });
    if (!transaction) return null;
    const walletTransaction = await this.findWalletTransactionByTransactionRef(transaction.id);
    return { ...transaction, walletTransaction };
  }

  /** Mirrors `controllers/Fleet/invoiceController.js:getFleetInvoice`'s `FleetUserDetail`/`FleetUser` include. */
  async findByIdWithFleetUser(id: number): Promise<any> {
    const transaction: any = await this.deviceTransactionRepo.findOne({ where: { id } });
    if (!transaction) return null;

    let fleetUser: any = null;
    if (transaction.fleetId) {
      fleetUser = await this.fleetUserDetailRepo
        .createQueryBuilder('fud')
        .select(['fud.id', 'fud.gst', 'fud.fleetUId', 'fud.cName'])
        .innerJoinAndSelect('fud.fleetUsers', 'fleetUsers', 'fleetUsers.type = :type', { type: 'FLEET_MANAGER' })
        .addSelect(['fleetUsers.name', 'fleetUsers.phone', 'fleetUsers.email'])
        .where('fud.id = :fleetId', { fleetId: transaction.fleetId })
        .getRawOne();
    }

    const walletTransaction = await this.findWalletTransactionByTransactionRef(transaction.id);
    return { ...transaction, fleetUser, walletTransaction };
  }

  /** Mirrors `controllers/APP/invoiceController.js:getDeviceTransactionSummary`'s full include chain. */
  async findByIdWithFullDetails(id: number): Promise<any> {
    const transaction = await this.deviceTransactionRepo.findOne({
      where: { id },
      relations: { user: true, charger: { station: { stationLocation: true } }, vehicle: true },
    });
    if (!transaction) return null;
    const walletTransaction = await this.findWalletTransactionByTransactionRef(transaction.id);
    return { ...transaction, walletTransaction };
  }

  findWalletTransactionByTransactionRef(transactionRef: number) {
    return this.walletTransactionRepo.findOne({ where: { transactionRef }, select: { refNo: true, sourceType: true } });
  }

  findClientDetails(clientId: number) {
    return this.clientDetailsRepo.findOne({
      where: { clientId },
      select: { id: true, companyName: true, contactEmail: true, contactPhone: true, gst: true, address: true, businessUrl: true, brandName: true, logoUrl: true, primaryColor: true },
    });
  }

  findConnector(connectorId: string, chargerRef: number) {
    return this.connectorRepo.findOne({ where: { connectorId, chargerId: chargerRef } });
  }
}
