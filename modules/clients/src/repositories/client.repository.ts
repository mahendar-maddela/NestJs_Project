import { Injectable } from '@nestjs/common';
import { InjectRepository, InjectDataSource } from '@nestjs/typeorm';
import { DataSource, Repository, FindOptionsWhere, In } from 'typeorm';
import { Staff } from '../entities/staff.entity';
import { ClientDetails } from '../entities/client-details.entity';
import { CredentialConfig } from '../entities/credential-config.entity';
import { PrefixConfig } from '../entities/prefix-config.entity';
import { ClientAmc } from '../../../billing/src/entities/client-amc.entity';
import { ClientFeature } from '../entities/client-feature.entity';
import { ClientFeatureMapping } from '../entities/client-feature-mapping.entity';
import { PaymentConfig } from '../../../payments/src/entities/payment-config.entity';
import { Address } from '../../../vendors/src/entities/address.entity';
import { Media } from '../../../stations/src/entities/media.entity';
import { Role } from '../entities/role.entity';
import { Permission } from '../entities/permission.entity';
import { RolePermission } from '../entities/role-permission.entity';
import { StaffRole } from '../entities/staff-role.entity';

@Injectable()
export class ClientRepository {
  constructor(
    @InjectRepository(Staff)
    private readonly staffRepo: Repository<Staff>,
    @InjectRepository(ClientDetails)
    private readonly clientDetailsRepo: Repository<ClientDetails>,
    @InjectRepository(CredentialConfig)
    private readonly credentialConfigRepo: Repository<CredentialConfig>,
    @InjectRepository(PrefixConfig)
    private readonly prefixConfigRepo: Repository<PrefixConfig>,
    @InjectRepository(ClientAmc)
    private readonly clientAmcRepo: Repository<ClientAmc>,
    @InjectRepository(ClientFeature)
    private readonly clientFeatureRepo: Repository<ClientFeature>,
    @InjectRepository(ClientFeatureMapping)
    private readonly clientFeatureMappingRepo: Repository<ClientFeatureMapping>,
    @InjectDataSource() private readonly dataSource: DataSource,
  ) { }

  async findPartyId(partyId: string, excludeClientId?: number) {
    const qb = this.clientDetailsRepo
      .createQueryBuilder('cd')
      .where('cd.partyId = :partyId', { partyId: partyId.toUpperCase() });
    if (excludeClientId) qb.andWhere('cd.clientId != :excludeClientId', { excludeClientId });
    return qb.getRawOne();
  }

  async findCompanyName(companyName: string) {
    return this.clientDetailsRepo.findOne({ where: { companyName } });
  }

  async findStaffByEmail(email: string, excludeId?: number) {
    const qb = this.staffRepo.createQueryBuilder('s').where('s.email = :email', { email });
    if (excludeId) qb.andWhere('s.id != :excludeId', { excludeId });
    return qb.getRawOne();
  }

  async findById(id: number) {
    return this.staffRepo.findOne({
      where: { id },
      relations: { clientDetails: true },
    });
  }

  async findClientFullDetails(id: number) {
    const client = await this.staffRepo.findOne({
      where: { id, clientId: id },
      relations: {
        clientDetails: true,
        prefixConfig: true,
        credentialConfig: true,
        assigned: true,
        clientAmcs: true,
        features: true,
        paymentConfig: true,
        clientAddress: true,
      },
    });

    if (!client) return null;

    const media = await this.dataSource.getRepository(Media).find({
      where: { mediable_id: id, entityType: 'Client' },
    });

    const sortedAmcs = client.clientAmcs
      ? [...client.clientAmcs].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 1)
      : [];

    return {
      ...client,
      media: media ?? [],
      clientAmcs: sortedAmcs,
    };
  }

  async findAllSimple(where: FindOptionsWhere<Staff> | FindOptionsWhere<Staff>[]) {
    return this.staffRepo.find({
      where: where as any,
      select: { id: true, first_name: true, last_name: true, clientId: true,clientDetails: { id: true, brandName: true } },
      relations: {
        clientDetails: true,
      },
      order: {
        createdAt: 'DESC',
      },
    });
  }

  async countClients(where: FindOptionsWhere<Staff> | FindOptionsWhere<Staff>[],) {
    return this.staffRepo.count({ where: where as any });
  }

  async findPaginated(where: FindOptionsWhere<Staff> | FindOptionsWhere<Staff>[], skip: number, take: number) {
    return this.staffRepo.find({
      where: where as any,
      skip,
      take,
      relations: {
        clientDetails: true,
      },
      order: { createdAt: 'DESC' },
    });
  }

  async createClientRecord(tx: DataSource | null, data: Partial<Staff>) {
    const repo = tx ? tx.getRepository(Staff) : this.staffRepo;
    return repo.save(repo.create(data));
  }

  async updateStaffRecord(tx: DataSource | null, id: number, data: Partial<Staff>) {
    const repo = tx ? tx.getRepository(Staff) : this.staffRepo;
    await repo.update(id, data as any);
    return repo.findOne({ where: { id } });
  }

  async createAddress(tx: DataSource | null, data: Record<string, unknown>) {
    const repo = tx ? tx.getRepository(Address) : this.dataSource.getRepository(Address);
    return repo.save(repo.create(data as any));
  }

  async upsertAddress(tx: DataSource | null, clientId: number, data: Record<string, unknown>) {
    const repo = tx ? tx.getRepository(Address) : this.dataSource.getRepository(Address);
    const existing = await repo.findOne({ where: { clientId } });
    if (existing) {
      await repo.update(existing.id, data as any);
      return repo.findOne({ where: { id: existing.id } });
    }
    return repo.save(repo.create({ clientId, ...data } as any));
  }

  async createClientDetails(tx: DataSource | null, data: Partial<ClientDetails>) {
    const repo = tx ? tx.getRepository(ClientDetails) : this.clientDetailsRepo;
    return repo.save(repo.create(data));
  }

  async updateClientDetails(tx: DataSource | null, id: number, data: Partial<ClientDetails>) {
    const repo = tx ? tx.getRepository(ClientDetails) : this.clientDetailsRepo;
    await repo.update(id, data as any);
    return repo.findOne({ where: { id } });
  }

  async findClientDetailsByClientId(tx: DataSource | null, clientId: number) {
    const repo = tx ? tx.getRepository(ClientDetails) : this.clientDetailsRepo;
    return repo.findOne({ where: { clientId } });
  }

  async createPaymentConfig(tx: DataSource | null, data: Record<string, unknown>) {
    const repo = tx ? tx.getRepository(PaymentConfig) : this.dataSource.getRepository(PaymentConfig);
    return repo.save(repo.create(data as any));
  }

  async createCredentialConfig(tx: DataSource | null, data: Partial<CredentialConfig>) {
    const repo = tx ? tx.getRepository(CredentialConfig) : this.credentialConfigRepo;
    return repo.save(repo.create(data));
  }

  async createPrefixConfig(tx: DataSource | null, data: Partial<PrefixConfig>) {
    const repo = tx ? tx.getRepository(PrefixConfig) : this.prefixConfigRepo;
    return repo.save(repo.create(data));
  }

  async updatePrefixConfig(tx: DataSource | null, clientId: number, data: Partial<PrefixConfig>) {
    const repo = tx ? tx.getRepository(PrefixConfig) : this.prefixConfigRepo;
    const existing = await repo.findOne({ where: { clientId } });
    if (existing) {
      await repo.update(existing.id, data as any);
      return repo.findOne({ where: { id: existing.id } });
    }
    return repo.save(repo.create({ clientId, ...data }));
  }

  async createClientAmc(tx: DataSource | null, data: Partial<ClientAmc>) {
    const repo = tx ? tx.getRepository(ClientAmc) : this.clientAmcRepo;
    return repo.save(repo.create(data));
  }

  async updateClientAmc(tx: DataSource | null, id: number, data: Partial<ClientAmc>) {
    const repo = tx ? tx.getRepository(ClientAmc) : this.clientAmcRepo;
    await repo.update(id, data as any);
    return repo.findOne({ where: { id } });
  }

  async findLatestClientAmc(tx: DataSource | null, clientId: number) {
    const repo = tx ? tx.getRepository(ClientAmc) : this.clientAmcRepo;
    return repo.findOne({ where: { clientId }, order: { createdAt: 'DESC' } });
  }

  async findClientDetailsForInfo(clientId: number) {
    return this.clientDetailsRepo
      .createQueryBuilder('cd')
      .select([
        'cd.id', 'cd.companyName', 'cd.brandName', 'cd.contactEmail', 'cd.contactPhone',
        'cd.gst', 'cd.address', 'cd.businessUrl', 'cd.logoUrl', 'cd.termsAndConditionsUrl',
        'cd.privacyPolicyUrl', 'cd.refundPolicyUrl', 'cd.supportUrl', 'cd.shippingPolicyUrl',
        'cd.userPortalUrl',
      ])
      .where('cd.clientId = :clientId', { clientId })
      .getRawOne();
  }

  async findCredentialConfigForInfo(clientId: number) {
    return this.credentialConfigRepo
      .createQueryBuilder('cc')
      .select(['cc.userLoginType'])
      .where('cc.clientId = :clientId', { clientId })
      .getRawOne();
  }

  async findClientFeaturesByName(names: string[]) {
    if (!names.length) return [];
    return this.clientFeatureRepo
      .createQueryBuilder('cf')
      .select(['cf.id', 'cf.name'])
      .where('cf.name IN (:...names)', { names })
      .getMany();
  }

  async findClientFeatureMappings(clientId: number, featureIds: number[]) {
    if (!featureIds.length) return [];
    return this.clientFeatureMappingRepo
      .createQueryBuilder('cfm')
      .select(['cfm.featureId'])
      .where('cfm.clientId = :clientId AND cfm.featureId IN (:...featureIds)', {
        clientId,
        featureIds,
      })
      .getMany();
  }

  async findMediaLogo(clientId: number) {
    // Media entity lives in modules/stations; use raw DataSource access to avoid circular deps
    return this.dataSource
      .createQueryBuilder()
      .select(['m.url'])
      .from('media', 'm')
      .where('m.mediable_id = :clientId AND m.mediable_type = :type', {
        clientId,
        type: 'logo',
      })
      .getRawOne<{ url: string }>();
  }

  /** Mirrors legacy `mediaHandler.js:saveMedia` — one Media row per client document type. */
  async saveClientMedia(clientId: number, mediableType: string, url: string, fileName: string) {
    const repo = this.dataSource.getRepository(Media);
    return repo.save(
      repo.create({
        mediable_id: clientId,
        mediable_type: mediableType,
        url,
        file_name: fileName,
        entityType: 'Client',
      }),
    );
  }

  /** Mirrors legacy `mediaHandler.js:updateMedia` — replaces the stored file for a document type. */
  async updateClientMedia(clientId: number, mediableType: string, url: string, fileName: string) {
    const repo = this.dataSource.getRepository(Media);
    const existing = await repo.findOne({
      where: { mediable_id: clientId, mediable_type: mediableType, entityType: 'Client' },
    });
    if (!existing) {
      return this.saveClientMedia(clientId, mediableType, url, fileName);
    }
    await repo.update(existing.id, { url, file_name: fileName });
    return existing;
  }

  async findClientMediaByType(clientId: number, mediableType: string) {
    return this.dataSource.getRepository(Media).findOne({
      where: { mediable_id: clientId, mediable_type: mediableType, entityType: 'Client' },
    });
  }

  /** Mirrors legacy `clientController.js:202-216` — creates the client's own "Admin" role, links it
   *  to the founding staff row, and grants it every `type: "staff"` permission. */
  async createAdminRoleForClient(tx: DataSource | null, clientId: number, staffId: number) {
    const roleRepo = tx ? tx.getRepository(Role) : this.dataSource.getRepository(Role);
    const staffRoleRepo = tx ? tx.getRepository(StaffRole) : this.dataSource.getRepository(StaffRole);
    const permissionRepo = tx ? tx.getRepository(Permission) : this.dataSource.getRepository(Permission);
    const rolePermissionRepo = tx ? tx.getRepository(RolePermission) : this.dataSource.getRepository(RolePermission);

    const role = await roleRepo.save(roleRepo.create({ name: 'Admin', type: 'staff', staffId, clientId }));
    await staffRoleRepo.save(staffRoleRepo.create({ roleId: role.id, staffId }));

    const permissions = await permissionRepo.find({ where: { type: 'staff' } });
    if (permissions.length > 0) {
      await rolePermissionRepo.save(
        permissions.map((p) => rolePermissionRepo.create({ roleId: role.id, permissionId: p.id })),
      );
    }

    return role;
  }

  /** Mirrors legacy `clientController.js:218-225` — attaches the selected `ClientFeature`s to the client. */
  async attachClientFeatures(tx: DataSource | null, clientId: number, featureIds: number[]) {
    if (!featureIds?.length) return;
    const featureRepo = tx ? tx.getRepository(ClientFeature) : this.clientFeatureRepo;
    const mappingRepo = tx ? tx.getRepository(ClientFeatureMapping) : this.clientFeatureMappingRepo;

    const found = await featureRepo.find({ where: { id: In(featureIds) } });
    if (found.length > 0) {
      await mappingRepo.save(found.map((f) => mappingRepo.create({ clientId, featureId: f.id })));
    }
  }

  /** Mirrors legacy `clientController.js:1108-1144` — full replace of a client's feature entitlements. */
  async replaceClientFeatures(tx: DataSource | null, clientId: number, featureIds: number[]) {
    const mappingRepo = tx ? tx.getRepository(ClientFeatureMapping) : this.clientFeatureMappingRepo;
    await mappingRepo.delete({ clientId });
    await this.attachClientFeatures(tx, clientId, featureIds);
  }

  async runTransaction<T>(fn: (tx: DataSource) => Promise<T>): Promise<T> {
    return this.dataSource.transaction((manager) => fn(manager as unknown as DataSource));
  }

  async findPaymentConfig(tx: DataSource | null, clientId: number) {
    const repo = tx ? tx.getRepository(PaymentConfig) : this.dataSource.getRepository(PaymentConfig);
    return repo.findOne({ where: { clientId } });
  }

  async updatePaymentConfig(tx: DataSource | null, id: number, data: Partial<PaymentConfig>) {
    const repo = tx ? tx.getRepository(PaymentConfig) : this.dataSource.getRepository(PaymentConfig);
    await repo.update(id, data as any);
    return repo.findOne({ where: { id } });
  }

  async findCredentialConfigByClientId(tx: DataSource | null, clientId: number) {
    const repo = tx ? tx.getRepository(CredentialConfig) : this.credentialConfigRepo;
    return repo.findOne({ where: { clientId } });
  }

  async updateCredentialConfig(tx: DataSource | null, id: number, data: Partial<CredentialConfig>) {
    const repo = tx ? tx.getRepository(CredentialConfig) : this.credentialConfigRepo;
    await repo.update(id, data as any);
    return repo.findOne({ where: { id } });
  }

  async findAllClientFeatures() {
    return this.clientFeatureRepo.find({ select: { id: true, name: true, description: true } });
  }
}
