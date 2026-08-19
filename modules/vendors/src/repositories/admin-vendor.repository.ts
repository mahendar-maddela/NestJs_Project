import { Injectable } from '@nestjs/common';
import { InjectRepository, InjectDataSource } from '@nestjs/typeorm';
import { DataSource, FindOptionsWhere, Repository } from 'typeorm';
import { Vendor } from '../entities/vendor.entity';
import { VendorUser } from '../entities/vendor-user.entity';
import { UserType } from '../entities/user-type.entity';
import { VendorBankDetails } from '../entities/vendor-bank-details.entity';
import { Role } from '../../../clients/src/entities/role.entity';
import { RolePermission } from '../../../clients/src/entities/role-permission.entity';
import { Feature } from '../entities/feature.entity';
import { FeaturePermission } from '../entities/feature-permission.entity';
import { IsNull, In, Like } from 'typeorm';
@Injectable()
export class AdminVendorRepository {
  constructor(
    @InjectRepository(Vendor)
    private readonly vendorRepo: Repository<Vendor>,
    @InjectRepository(VendorUser)
    private readonly vendorUserRepo: Repository<VendorUser>,
    @InjectRepository(UserType)
    private readonly userTypeRepo: Repository<UserType>,
    @InjectDataSource() private readonly dataSource: DataSource,
  ) { }

  async findVendorByEmailAndClient(email: string, clientId: number) {
    return this.vendorRepo.findOne({ where: { email, clientId } });
  }

  async findVendorByIdAndClient(id: number, clientId: number) {
    return this.vendorRepo.findOne({
      where: { id, clientId },
      relations: {
        stations: true,
        chargers: true,
        tariffs: true,
        subVendors: true,
        vendorBankDetails: true,
        features: true,
      },
    });
  }

  /** The vendor's feature rows via the `featurepermissions` join — mirrors legacy's `include: [{ model: Feature, as: 'features' }]`. */
  // async findVendorFeatures(vendorId: number) {
  //   return this.dataSource
  //     .createQueryBuilder()
  //     .select('f.id', 'id')
  //     .addSelect('f.name', 'name')
  //     .from('features', 'f')
  //     .innerJoin('featurepermissions', 'fp', 'fp.featureId = f.id')
  //     .where('fp.vendorId = :vendorId', { vendorId })
  //     .orderBy('f.id', 'ASC')
  //     .getRawMany();
  // }

  async countVendorsByClient(clientId: number) {
    return this.vendorRepo.count({ where: { clientId } });
  }

  async findById(id: number) {
    return this.vendorRepo.findOne({ where: { id } });
  }

  async findLeanByIdAndClient(id: number, clientId: number) {
    return this.vendorRepo.findOne({ where: { id, clientId } });
  }

  async updateStatus(id: number, status: string) {
    await this.vendorRepo.update(id, { status } as any);
  }

  async updatePassword(id: number, hashedPassword: string) {
    await this.vendorRepo.update(id, { password: hashedPassword } as any);
  }

  async findPrefixConfig(clientId: number) {
    return this.dataSource
      .createQueryBuilder()
      .select('pc.*')
      .from('prefixconfigs', 'pc')
      .where('pc.clientId = :clientId', { clientId })
      .getRawOne();
  }

  async findVendorPermissions() {
    // Alias the column explicitly — `select(['p.id'])` comes back as `p_id` on raw queries,
    // which would leave every role permission with an undefined permissionId.
    return this.dataSource
      .createQueryBuilder()
      .select('p.id', 'id')
      .from('permissions', 'p')
      .where('p.type = :type', { type: 'vendor' })
      .getRawMany<{ id: number }>();
  }

  async findClientDetails(clientId: number) {
    // `select(['cd.xxx'])` returns raw keys prefixed `cd_` — map them back to clean names so
    // the branded vendor email gets the tenant's real brandName/logo/color/login URL.
    const row = await this.dataSource
      .createQueryBuilder()
      .select([
        'cd.id', 'cd.clientId', 'cd.companyName', 'cd.contactEmail', 'cd.contactPhone',
        'cd.address', 'cd.brandName', 'cd.logoUrl', 'cd.primaryColor', 'cd.cpoUrl', 'cd.zipCode',
      ])
      .from('clientdetails', 'cd')
      .where('cd.clientId = :clientId', { clientId })
      .getRawOne();

    if (!row) return null;

    return {
      id: row.cd_id,
      clientId: row.cd_clientId,
      companyName: row.cd_companyName,
      contactEmail: row.cd_contactEmail,
      contactPhone: row.cd_contactPhone,
      address: row.cd_address,
      brandName: row.cd_brandName,
      logoUrl: row.cd_logoUrl,
      primaryColor: row.cd_primaryColor,
      cpoUrl: row.cd_cpoUrl,
      zipCode: row.cd_zipCode,
    };
  }

  async createVendorWithDetails(params: {
    vendorData: Partial<Vendor>;
    staffId: number;
    clientId: number;
    bankDetails?: any;
    featureIds?: number[];
  }) {
    return this.dataSource.transaction(async (manager) => {
      const vendorEntity = manager.create(Vendor, params.vendorData);
      const createdVendor = await manager.save(Vendor, vendorEntity);

      const roleEntity = manager.create(Role, {
        name: 'Admin',
        type: 'vendor',
        vendorId: createdVendor.id,
        clientId: params.clientId,
      } as any);
      const createdRole = await manager.save(Role, roleEntity);

      const permissions = await this.findVendorPermissions();
      if (permissions.length > 0) {
        const rpEntities = permissions.map((p) =>
          manager.create(RolePermission, { roleId: createdRole.id, permissionId: p.id } as any),
        );
        await manager.save(RolePermission, rpEntities);
      }

      if (params.featureIds && params.featureIds.length > 0) {
        const featureRepo = manager.getRepository(Feature);
        const features = await featureRepo.find({ where: { id: In(params.featureIds) } });
        if (features.length > 0) {
          const fpRepo = manager.getRepository(FeaturePermission);
          await fpRepo.save(
            features.map((f) => fpRepo.create({ vendorId: createdVendor.id, featureId: f.id })),
          );
        }
      }

      if (params.bankDetails) {
        const bankEntity = manager.create(VendorBankDetails, {
          vendorId: createdVendor.id,
          bankName: params.bankDetails.bankName,
          accountHolderName: params.bankDetails.accountHolderName,
          accountNumber: params.bankDetails.accountNumber ? Number(params.bankDetails.accountNumber) : undefined,
          branchName: params.bankDetails.branchName,
          ifsCode: params.bankDetails.ifsCode,
        });
        await manager.save(VendorBankDetails, bankEntity);
      }

      return createdVendor;
    });
  }

  async updateVendorWithDetails(id: number, params: { vendorData: Partial<Vendor>; bankDetails?: any; featureIds?: number[] }) {
    return this.dataSource.transaction(async (manager) => {
      await manager.update(Vendor, id, params.vendorData as any);

      if (params.featureIds && Array.isArray(params.featureIds)) {
        const fpRepo = manager.getRepository(FeaturePermission);
        await fpRepo.delete({ vendorId: id });

        const featureRepo = manager.getRepository(Feature);
        const features = await featureRepo.find({ where: { id: In(params.featureIds) } });
        if (features.length > 0) {
          await fpRepo.save(features.map((f) => fpRepo.create({ vendorId: id, featureId: f.id })));
        }
      }

      if (params.bankDetails) {
        const existingBank = await manager.findOne(VendorBankDetails, { where: { vendorId: id } });

        const bankData = {
          accountHolderName: params.bankDetails.accountHolderName,
          accountNumber: params.bankDetails.accountNumber ? Number(params.bankDetails.accountNumber) : undefined,
          branchName: params.bankDetails.branchName,
          ifsCode: params.bankDetails.ifsCode,
          bankName: params.bankDetails.bankName,
        };

        if (existingBank) {
          await manager.update(VendorBankDetails, existingBank.id, bankData as any);
        } else {
          await manager.save(VendorBankDetails, manager.create(VendorBankDetails, { vendorId: id, ...bankData }));
        }
      }
    });
  }

  async findPaginatedVendors(
    where: FindOptionsWhere<Vendor> | FindOptionsWhere<Vendor>[],
    skip: number,
    limit: number,
  ) {
    const [rows, count] = await this.vendorRepo.findAndCount({
      where: where as any,
      skip,
      take: limit,
      select: {
        id: true,
        vendorUniqueId: true,
        vendor_name: true,
        community_name: true,
        phone: true,
        status: true,
        email: true,
        location: true,
      },
      order: {
        id: 'DESC',
      },
    });

    return {
      count,
      rows,
    };
  }
  async findAllSimpleVendors(where: Record<string, unknown>) {
    const rows = await this.vendorRepo.find({
      where: where as any,
      select: { id: true, vendor_name: true, vendorTypeId: true },
    });
    return { count: rows.length, rows };
  }

  async findVendorStationById(id: number, clientId: number) {
    return this.vendorRepo.findOne({
      where: { id, clientId },
      select: { id: true, vendor_name: true },
      relations: { stations: { chargers: { connectors: true } } },
    });
  }

  async findVendorChargersById(id: number) {
    return this.vendorRepo.findOne({
      where: { id },
      select: { id: true, vendor_name: true },
      relations: { chargers: { connectors: true } },
    });
  }

  async findVendorEmployeesById(id: number) {
    return this.vendorRepo.findOne({
      where: { id },
      select: { id: true, vendor_name: true },
      relations: { subVendors: true, roles: true },
    });
  }

  async findVendorUsers(vendorId: number, skip: number, limit: number) {
    const [vendorUsers, count] = await this.vendorUserRepo.findAndCount({
      where: { vendorId },
      skip,
      take: limit,
    });

    const userIds = vendorUsers.map((vu) => vu.userId).filter((id): id is number => id !== null);

    if (!userIds.length) return { count, users: [] };

    const users = await this.dataSource
      .createQueryBuilder()
      .select('u.*')
      .from('users', 'u')
      .where('u.id IN (:...userIds)', { userIds })
      .getRawMany();

    const chargerIds: number[] = await this.dataSource
      .createQueryBuilder()
      .select('c.id')
      .from('chargers', 'c')
      .where('c.vendorId = :vendorId', { vendorId })
      .getRawMany()
      .then((rows) => rows.map((r) => r.c_id));

    const updatedUsers = await Promise.all(
      users.map(async (user) => {
        const vu = vendorUsers.find((item) => item.userId === user.id);
        const userTypeRecord = vu?.userTypeId
          ? await this.userTypeRepo.findOne({ where: { id: vu.userTypeId } })
          : null;

        const consumedResult = chargerIds.length
          ? await this.dataSource
            .createQueryBuilder()
            .select('SUM(dt.totalWh)', 'totalWh')
            .from('devicetransactions', 'dt')
            .where('dt.userId = :userId AND dt.chargerRef IN (:...chargerIds)', {
              userId: user.id,
              chargerIds,
            })
            .getRawOne<{ totalWh: string }>()
          : { totalWh: '0' };

        const spentResult = chargerIds.length
          ? await this.dataSource
            .createQueryBuilder()
            .select('SUM(dt.price)', 'price')
            .from('devicetransactions', 'dt')
            .where('dt.userId = :userId AND dt.chargerRef IN (:...chargerIds)', {
              userId: user.id,
              chargerIds,
            })
            .getRawOne<{ price: string }>()
          : { price: '0' };

        const credit = await this.dataSource
          .createQueryBuilder()
          .select('cr.balance')
          .from('credits', 'cr')
          .where('cr.userId = :userId AND cr.vendorId = :vendorId', { userId: user.id, vendorId })
          // Raw selects alias the column (`cr_balance`) — type it accordingly.
          .getRawOne<{ cr_balance: number }>();

        return {
          userId: user.id,
          first_name: user.first_name,
          last_name: user.last_name,
          userType: userTypeRecord?.name || 'Standard',
          status: user.status,
          consumedUnits: Number(consumedResult?.totalWh || 0),
          totalAmountSpent: Number(spentResult?.price || 0),
          // `select('cr.balance')` comes back as `cr_balance` on raw queries.
          creditBalance: credit?.cr_balance ?? 0,
        };
      }),
    );

    return { count, users: updatedUsers };
  }

  async findVendorTariffsById(id: number) {
    const vendor = await this.vendorRepo.findOne({
      where: { id },
      select: { id: true, vendor_name: true, vendorUniqueId: true },
      relations: { userTypes: { tariffs: true }, tariffs: true },
    });

    if (!vendor) return null;

    const tariffIds = (vendor as any).tariffs?.map((t: any) => t.id) ?? [];
    const totalChargers = tariffIds.length
      ? await this.dataSource
        .createQueryBuilder()
        .select('COUNT(*)', 'cnt')
        .from('tariffs', 't')
        .where('t.id IN (:...tariffIds) AND t.chargerId IS NOT NULL', { tariffIds })
        .getRawOne<{ cnt: string }>()
        .then((r) => Number(r?.cnt ?? 0))
      : 0;

    return { ...vendor, chargerCount: totalChargers };
  }

  async deleteVendorRecord(id: number) {
    return this.vendorRepo.delete(id);
  }

  async findVendorWalletTransactions(id: number, skip: number, limit: number) {
    const walletRow = await this.dataSource
      .createQueryBuilder()
      .select(['w.id'])
      .from('wallets', 'w')
      .where('w.vendorId = :id', { id })
      .orderBy('w.id', 'ASC')
      .limit(1)
      .getRawOne<{ w_id: number }>();

    const walletId = walletRow?.w_id;
    if (!walletId) return { count: 0, rows: [] };

    const total = await this.dataSource
      .createQueryBuilder()
      .select('COUNT(*)', 'cnt')
      .from('wallettransactions', 'wt')
      .where('wt.walletId = :walletId', { walletId })
      .getRawOne<{ cnt: string }>();

    const rows = await this.dataSource
      .createQueryBuilder()
      .select('wt.*')
      .from('wallettransactions', 'wt')
      .where('wt.walletId = :walletId', { walletId })
      .skip(skip)
      .take(limit)
      .orderBy('wt.id', 'DESC')
      .getRawMany();

    return { count: Number(total?.cnt ?? 0), rows };
  }

  async findAllVendorStations(vendorId: number) {
    return this.dataSource
      .createQueryBuilder()
      .select('s.*')
      .from('stations', 's')
      .where('s.vendorId = :vendorId', { vendorId })
      .getRawMany();
  }

  async findAllVendorTariffs(vendorId: number) {
    return this.dataSource
      .createQueryBuilder()
      .select('t.*')
      .from('tariffs', 't')
      .where('t.vendorId = :vendorId', { vendorId })
      .getRawMany();
  }

  async findVendorsWithStationsAndChargers(clientId: number) {
    return this.vendorRepo.find({
      where: { clientId },
      select: { id: true, vendor_name: true },
      relations: { stations: { chargers: true } },
    });
  }

  async findVendorCountsCard(id: number, clientId: number) {
    const vendor = await this.vendorRepo.findOne({
      where: { id, clientId },
      select: {
        id: true,
        noOfStations: true,
        vendor_name: true,
        vendorUniqueId: true,
      },
    });

    if (!vendor) return null;

    const [totalStations, totalChargers] = await Promise.all([
      this.dataSource
        .createQueryBuilder()
        .select('COUNT(*)', 'cnt')
        .from('stations', 's')
        .where('s.vendorId = :id', { id })
        .getRawOne<{ cnt: string }>()
        .then((r) => Number(r?.cnt ?? 0)),
      this.dataSource
        .createQueryBuilder()
        .select('COUNT(*)', 'cnt')
        .from('chargers', 'c')
        .where('c.vendorId = :id', { id })
        .getRawOne<{ cnt: string }>()
        .then((r) => Number(r?.cnt ?? 0)),
    ]);

    return {
      vendor,
      totalStations,
      totalChargers,
      totalFeature: 0,
      noOfStations: vendor.noOfStations || 0,
    };
  }
}
