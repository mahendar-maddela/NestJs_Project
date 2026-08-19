import { Injectable } from '@nestjs/common';
import { InjectRepository, InjectDataSource } from '@nestjs/typeorm';
import { DataSource, Repository, IsNull, In } from 'typeorm';
import { Charger } from '../entities/charger.entity';
import { Connector } from '../entities/connector.entity';
import { ChargerSpecification } from '../entities/charger-specification.entity';
import { ChargerConfiguration } from '../entities/charger-configuration.entity';
import { Logs } from '../entities/logs.entity';
import { LogConfiguration } from '../entities/log-configuration.entity';
import { Tariff } from '../../../tariffs/src/entities/tariff.entity';
import { CpoAmc } from '../../../billing/src/entities/cpo-amc.entity';
import { ClientChargerAmc } from '../../../billing/src/entities/client-charger-amc.entity';

@Injectable()
export class AdminChargerRepository {
  constructor(
    @InjectRepository(Charger)
    private readonly chargerRepo: Repository<Charger>,
    @InjectRepository(Connector)
    private readonly connectorRepo: Repository<Connector>,

    @InjectRepository(ChargerSpecification)
    private readonly chargerSpecRepo: Repository<ChargerSpecification>,
    @InjectRepository(ChargerConfiguration)
    private readonly chargerConfigRepo: Repository<ChargerConfiguration>,
    @InjectRepository(Logs)
    private readonly logsRepo: Repository<Logs>,
    @InjectDataSource() private readonly dataSource: DataSource,
  ) { }

  async findChargerByChargerId(chargerId: string) {
    return this.chargerRepo
      .createQueryBuilder('c')
      .select(['c.id', 'c.chargerId'])
      .where('c.chargerId = :chargerId', { chargerId })
      .getRawOne();
  }

  async findStationById(id: number) {
    return this.dataSource
      .createQueryBuilder()
      .select(['s.id', 's.vendorId'])
      .from('stations', 's')
      .where('s.id = :id', { id })
      .getRawOne<{ id: number; vendorId: number }>();
  }

  async createChargerWithDetails(params: {
    chargerData: Partial<Charger>;
    connectors?: any[];
    tariffPrice?: number;
    gst?: number;
    amcStartDate?: string;
    amcEndDate?: string;
    amcChargeType?: string;
    amcAmount?: number;
    logConfigs?: any[];
    chargerConfigs?: any[];
  }) {
    return this.dataSource.transaction(async (manager) => {
      const chargerEntity = manager.create(Charger, params.chargerData);
      const createdCharger = await manager.save(Charger, chargerEntity);

      if (params.connectors && params.connectors.length > 0) {
        const connectorEntities = params.connectors.map((c) =>
          manager.create(Connector, {
            chargerId: createdCharger.id,
            connectorId: String(c.connectorId),
            portType: c.portType,
            max_power: c.max_power ? String(c.max_power) : undefined,
            status: c.status || 'Available',
          }),
        );
        await manager.save(Connector, connectorEntities);
      }

      if (params.tariffPrice !== undefined) {
        const tariffEntity = manager.create(Tariff, {
          price: params.tariffPrice,
          gst: params.gst || 0,
          vendorId: createdCharger.vendorId,
          stationId: createdCharger.stationId,
          chargerId: createdCharger.id,
          userTypeId: null,
          staffId: createdCharger.staffId,
          clientId: createdCharger.clientId,
        } as any);
        await manager.save(Tariff, tariffEntity);
      }

      if (params.amcStartDate && params.amcEndDate) {
        const amcEntity = manager.create(CpoAmc, {
          vendorId: createdCharger.vendorId,
          chargerId: createdCharger.id,
          startDate: new Date(params.amcStartDate),
          endDate: new Date(params.amcEndDate),
          chargeType: params.amcChargeType || 'Fixed',
          amount: String(params.amcAmount ?? 0),
          status: 'Active',
          clientId: createdCharger.clientId,
        } as any);
        await manager.save(CpoAmc, amcEntity);
      }

      if (params.logConfigs && params.logConfigs.length > 0) {
        const logEntities = params.logConfigs.map((lc) =>
          manager.create(LogConfiguration, {
            chargerRef: createdCharger.id,
            chargerId: createdCharger.chargerId,
            ...lc,
          }),
        );
        await manager.save(LogConfiguration, logEntities);
      }

      if (params.chargerConfigs && params.chargerConfigs.length > 0) {
        const ccEntities = params.chargerConfigs.map((cc) =>
          manager.create(ChargerConfiguration, {
            chargerRef: createdCharger.id,
            chargerId: createdCharger.chargerId,
            ...cc,
          }),
        );
        await manager.save(ChargerConfiguration, ccEntities);
      }

      const clientAmcEntity = manager.create(ClientChargerAmc, {
        chargerId: createdCharger.id,
        clientId: createdCharger.clientId,
        status: 'Onboarded',
      } as any);
      await manager.save(ClientChargerAmc, clientAmcEntity);

      return createdCharger;
    });
  }

  async updateChargerWithDetails(id: number, params: {
    chargerData: Partial<Charger>;
    connectors?: any[];
    tariffPrice?: number;
    gst?: number;
    amcStartDate?: string;
    amcEndDate?: string;
    amcChargeType?: string;
    amcAmount?: number;
    clientId: number;
  }) {
    return this.dataSource.transaction(async (manager) => {
      if (Object.keys(params.chargerData).length > 0) {
        await manager.update(Charger, id, params.chargerData as any);
      }
      const charger = await manager.findOne(Charger, { where: { id } });

      if (!charger) return;

      if (params.connectors) {
        const existingConnectors = await manager.find(Connector, {
          where: { chargerId: id },
        });

        const existingConnectorIds = existingConnectors.map((c) => Number(c.connectorId));
        const newConnectorIds = params.connectors.map((item) => Number(item.connectorId));

        const connectorsToDelete = existingConnectorIds.filter(
          (cId) => !newConnectorIds.includes(cId),
        );

        if (connectorsToDelete.length > 0) {
          await manager.delete(Connector, {
            chargerId: id,
            connectorId: In(connectorsToDelete.map(String)),
          });
        }

        for (const item of params.connectors) {
          const exists = await manager.findOne(Connector, {
            where: {
              chargerId: id,
              connectorId: String(item.connectorId),
            },
          });

          if (exists) {
            await manager.update(Connector, exists.id, {
              connectorId: String(item.connectorId),
              portType: item.portType,
              max_power: item.max_power ? String(item.max_power) : undefined,
              tariffId: item.tariffId,
            } as any);
          } else {
            const newConn = manager.create(Connector, {
              chargerId: id,
              connectorId: String(item.connectorId),
              portType: item.portType,
              max_power: item.max_power ? String(item.max_power) : undefined,
              status: item.status || 'Available',
              clientId: params.clientId,
            });
            await manager.save(Connector, newConn);
          }
        }
      }

      if (params.tariffPrice !== undefined || params.gst !== undefined) {
        const existingTariff = await manager.findOne(Tariff, { where: { chargerId: id, userTypeId: IsNull() } as any });
        if (existingTariff) {
          await manager.update(Tariff, (existingTariff as any).id, {
            price: params.tariffPrice !== undefined ? params.tariffPrice : (existingTariff as any).price,
            gst: params.gst !== undefined ? params.gst : (existingTariff as any).gst,
            vendorId: charger.vendorId,
          } as any);
        } else {
          const tariffEntity = manager.create(Tariff, {
            price: params.tariffPrice ?? 0,
            gst: params.gst ?? 0,
            vendorId: charger.vendorId,
            stationId: charger.stationId,
            chargerId: id,
            userTypeId: null,
            staffId: charger.staffId,
            clientId: charger.clientId,
          } as any);
          await manager.save(Tariff, tariffEntity);
        }
      }

      if (params.amcStartDate && params.amcEndDate) {
        const existingAmc = await manager.findOne(CpoAmc, { where: { chargerId: id } as any, order: { id: 'DESC' } });
        if (existingAmc) {
          await manager.update(CpoAmc, (existingAmc as any).id, {
            startDate: new Date(params.amcStartDate),
            endDate: new Date(params.amcEndDate),
            amount: params.amcAmount !== undefined ? String(params.amcAmount) : (existingAmc as any).amount,
            chargeType: params.amcChargeType || (existingAmc as any).chargeType || 'Fixed',
            status: 'Active',
          } as any);
        } else {
          const amcEntity = manager.create(CpoAmc, {
            vendorId: charger.vendorId,
            chargerId: id,
            startDate: new Date(params.amcStartDate),
            endDate: new Date(params.amcEndDate),
            amount: String(params.amcAmount ?? 0),
            chargeType: params.amcChargeType || 'Fixed',
            status: 'Active',
            clientId: charger.clientId,
          } as any);
          await manager.save(CpoAmc, amcEntity);
        }
      }
    });
  }

  async findPaginatedChargers(
    filters: {
      clientId: number;
      vendorId?: number;
      stationId?: number;
      vendorTypeId?: number;
      search?: string;
    },
    skip: number,
    limit: number,
  ) {
    const qb = this.chargerRepo
      .createQueryBuilder('charger')
      .leftJoinAndSelect('charger.connectors', 'connectors')
      .leftJoinAndSelect('charger.station', 'station')
      .leftJoinAndSelect('charger.vendor', 'vendor')
      .leftJoinAndSelect('charger.tariff', 'tariff', 'tariff.userTypeId IS NULL')
      .where('charger.clientId = :clientId', { clientId: filters.clientId });

    if (filters.vendorId) {
      qb.andWhere('charger.vendorId = :vendorId', { vendorId: filters.vendorId });
    }

    if (filters.stationId) {
      qb.andWhere('charger.stationId = :stationId', { stationId: filters.stationId });
    }

    if (filters.vendorTypeId) {
      qb.andWhere('vendor.vendorTypeId = :vendorTypeId', { vendorTypeId: filters.vendorTypeId });
    }

    if (filters.search) {
      qb.andWhere(
        '(charger.chargerId LIKE :search OR charger.portType LIKE :search)',
        { search: `%${filters.search}%` },
      );
    }

    qb.orderBy('charger.id', 'DESC')
      .skip(skip)
      .take(limit);

    const [rows, count] = await qb.getManyAndCount();
    return { count, rows };
  }

  async findSimpleChargers(filters: {
    clientId: number;
    vendorId?: number;
    stationId?: number;
    vendorTypeId?: number;
  }) {
    const qb = this.chargerRepo
      .createQueryBuilder('charger')
      .leftJoin('charger.vendor', 'vendor')
      .where('charger.clientId = :clientId', { clientId: filters.clientId });

    if (filters.vendorId) {
      qb.andWhere('charger.vendorId = :vendorId', { vendorId: filters.vendorId });
    }

    if (filters.stationId) {
      qb.andWhere('charger.stationId = :stationId', { stationId: filters.stationId });
    }

    if (filters.vendorTypeId) {
      qb.andWhere('vendor.vendorTypeId = :vendorTypeId', { vendorTypeId: filters.vendorTypeId });
    }

    qb.select([
      'charger.id',
      'charger.chargerId',
      'charger.status',
      'charger.stationId',
      'charger.capacity',
      'charger.vendorId',
    ]).orderBy('charger.createdAt', 'DESC');

    const chargers = await qb.getMany();
    return { count: chargers.length, chargers };
  }

  async findChargerByIdAndClient(id: number, clientId: number) {
    return this.chargerRepo.findOne({
      where: { id, clientId },
      relations: {
        connectors: true,
        station: true,
        vendor: true,
        tariff: true,
        roamingTariffs: true,
        specification: true,
      },
    });
  }
  async findConnectorsByCharger(chargerId: number) {
    return this.connectorRepo.find({ where: { chargerId } });
  }

  async findBaseTariffByCharger(chargerId: number) {
    return this.dataSource
      .createQueryBuilder()
      .select('t.*')
      .from('tariffs', 't')
      .where('t.chargerId = :chargerId AND t.userTypeId IS NULL', { chargerId })
      .getRawOne();
  }

  async findLatestAmcByCharger(chargerId: number) {
    return this.dataSource
      .createQueryBuilder()
      .select('ca.*')
      .from('cpoamcs', 'ca')
      .where('ca.chargerId = :chargerId', { chargerId })
      .orderBy('ca.id', 'DESC')
      .getRawOne();
  }

  async deleteCharger(id: number) {
    return this.chargerRepo.delete(id);
  }

  async findChargersByStationId(stationId: number, clientId: number) {
    return this.chargerRepo.find({
      where: { stationId, clientId },
      select: {
        id: true,
        chargerId: true,
        capacity: true,
        status: true,
      },
      relations: {
        connectors: true,
      },
    });
  }

  async findChargerSpecification(chargerRef: number) {
    return this.chargerSpecRepo.findOne({ where: { chargerRef } });
  }

  async findChargerConfigurations(chargerRef: number) {
    return this.chargerConfigRepo.find({ where: { chargerRef } });
  }

  async findLogs(where: Record<string, unknown>, skip: number, limit: number) {
    const [rows, count] = await this.logsRepo.findAndCount({
      where: where as any,
      skip,
      take: limit,
      order: { id: 'DESC' },
    });
    return { count, rows };
  }

  async findAllLogsDateWise(where: Record<string, unknown>) {
    return this.logsRepo.find({ where: where as any, order: { id: 'DESC' } });
  }

  async findChargerForConfig(id: number, clientId: number) {
    return this.chargerRepo.findOne({
      where: { id, clientId },
      select: {
        id: true,
        chargerId: true,
        capacity: true,
        connectors: {
          id: true,
          connectorId: true,
        },
      },
      relations: {
        connectors: true,
      },
    });
  }
}
