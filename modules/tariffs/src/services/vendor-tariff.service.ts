import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { VendorTariffRepository } from '../repositories/vendor-tariff.repository';
import {
  CreateVendorTariffDto,
  UpdateVendorTariffDto,
  UpdateStandardChargerTariffDto,
  AssignVendorUserOrGroupDto,
} from '../dto/vendor-tariff.dto';

/** Mirrors `controllers/vendors/tariffController.js`. */
@Injectable()
export class VendorTariffService {
  constructor(private readonly repo: VendorTariffRepository) {}

  async createTariff(vendorId: number, clientId: number, dto: CreateVendorTariffDto) {
    const { name, startDate, endDate, chargers = [] } = dto;

    const standard = await this.repo.createUserType({ name, vendorId, clientId, startDate: new Date(startDate), endDate: new Date(endDate) });

    const newTariffs = await Promise.all(
      chargers.map(async (charger) => {
        if (!charger.price) return null;
        const standardTariff = await this.repo.findStandardTariffByCharger(charger.chargerId);
        // Legacy dereferences `standardTariff.gst` unconditionally, which throws if no standard
        // tariff row exists yet for the charger — implemented as a null-safe fallback instead.
        return this.repo.createTariff({
          userTypeId: standard.id,
          vendorId,
          chargerId: charger.chargerId,
          price: charger.price,
          gst: standardTariff?.gst ?? null,
          clientId,
        });
      }),
    );

    return { success: true, message: 'Tariff created successfully', data: { tariff: newTariffs } };
  }

  async getAllTariffs(vendorId: number, search: string | undefined, page: number, limit: number) {
    const skip = (page - 1) * limit;
    const [tariffs, count] = await this.repo.findAndCountByVendor(vendorId, search, skip, limit);

    return {
      success: true,
      message: 'Tariffs fetched successfully',
      data: tariffs,
      pagination: { totalPages: Math.ceil(count / limit), total: count, page },
    };
  }

  async getTariffById(id: number, vendorId: number) {
    const tariff = await this.repo.findUserTypeWithTariffsByIdAndVendor(id, vendorId);
    if (!tariff) {
      throw new NotFoundException({ success: false, message: 'Tariff not found' });
    }

    const chargerIds = (tariff.tariffs || []).map((t) => t.charger?.id).filter((v): v is number => Boolean(v));
    const standardTariffs = chargerIds.length ? await Promise.all(chargerIds.map((cid) => this.repo.findStandardTariffByCharger(cid))) : [];
    const standardByCharger = new Map<number, unknown>();
    chargerIds.forEach((cid, i) => {
      if (standardTariffs[i]) standardByCharger.set(cid, standardTariffs[i]);
    });

    const data = {
      ...tariff,
      tariffs: (tariff.tariffs || []).map((t) => ({
        ...t,
        charger: t.charger
          ? { ...t.charger, tariff: standardByCharger.has(t.charger.id) ? [standardByCharger.get(t.charger.id)] : [] }
          : t.charger,
      })),
    };

    return { success: true, message: 'Tariff details fetched successfully', data };
  }

  async updateTariff(id: number, vendorId: number, clientId: number, dto: UpdateVendorTariffDto) {
    const { name, startDate, endDate, chargers = [] } = dto;

    const userType = await this.repo.findUserTypeByIdVendorClient(id, vendorId, clientId);
    if (!userType) {
      throw new NotFoundException({ success: false, message: 'Tariff not found' });
    }

    await this.repo.updateUserType(id, { name, startDate: new Date(startDate), endDate: new Date(endDate) });

    const incomingChargerIds = chargers.map((c) => c.chargerId);
    await this.repo.deleteStaleTariffs(id, vendorId, incomingChargerIds);

    for (const charger of chargers) {
      const existing = await this.repo.findTariffByUserTypeChargerVendor(id, charger.chargerId, vendorId);
      if (existing) {
        await this.repo.updateTariff(existing.id, {
          price: charger.price || existing.price,
          gst: charger.gst || existing.gst,
        });
      } else if (charger.price) {
        const standardPrice = await this.repo.findStandardTariffByChargerAndVendor(charger.chargerId, vendorId);
        await this.repo.createTariff({
          userTypeId: id,
          vendorId,
          chargerId: charger.chargerId,
          price: charger.price,
          gst: charger.gst || standardPrice?.gst || null,
          clientId,
        });
      }
    }

    return { success: true, message: 'Tariff updated successfully' };
  }

  async deleteTariff(id: number, vendorId: number) {
    const userType = await this.repo.findUserTypeByIdAndVendor(id, vendorId);
    if (!userType) {
      throw new NotFoundException({ success: false, message: 'Tariff not found' });
    }

    await this.repo.deleteTariffsByUserTypeAndVendor(id, vendorId);
    await this.repo.deleteUserType(id);

    return { success: true, message: 'Tariff deleted successfully' };
  }

  async updateStandardChargerTariff(chargerId: number, vendorId: number, dto: UpdateStandardChargerTariffDto) {
    if (parseFloat(String(dto.price)) <= 0) {
      throw new BadRequestException({ success: false, message: 'Price must be greater than 0' });
    }

    const tariff = await this.repo.findStandardTariffByChargerAndVendor(chargerId, vendorId);
    if (!tariff) {
      throw new NotFoundException({ success: false, message: 'Standard Tariff not found for this charger' });
    }

    await this.repo.updateTariff(tariff.id, { price: dto.price as number, gst: dto.gst as number | undefined });
    const updated = await this.repo.findStandardTariffByChargerAndVendor(chargerId, vendorId);

    return { success: true, message: 'Standard Tariff updated successfully', data: updated };
  }

  async createUserVendorUserType(userTypeId: number, vendorId: number, clientId: number, dto: AssignVendorUserOrGroupDto) {
    const { userIds = [], userTypeI, groupIds = [] } = dto;

    if (userTypeId !== parseInt(userTypeI, 10)) {
      throw new BadRequestException({ success: false, message: 'User Type ID mismatch' });
    }
    if (userIds.length > 0 && groupIds.length > 0) {
      throw new BadRequestException({ success: false, message: 'Provide either userIds or groupIds, not both' });
    }
    if (userIds.length === 0 && groupIds.length === 0) {
      throw new BadRequestException({ success: false, message: 'Either userIds or groupIds is required' });
    }

    if (groupIds.length > 0) {
      return this.assignGroups(userTypeId, vendorId, clientId, groupIds);
    }
    return this.assignUsers(userTypeId, vendorId, clientId, userIds);
  }

  private async assignGroups(userTypeId: number, vendorId: number, clientId: number, groupIds: number[]) {
    const alreadyExists: number[] = [];
    const notFound: number[] = [];

    for (const gid of groupIds) {
      const group = await this.repo.findFleetVehicleGroupById(gid);
      if (!group) {
        notFound.push(gid);
        continue;
      }
      const check = await this.repo.findVendorUserByFleetGroupAndVendor(group.id, vendorId);
      if (check) alreadyExists.push(gid);
    }

    if (alreadyExists.length > 0) {
      throw new BadRequestException({ success: false, message: `Groups ${alreadyExists.join(', ')} already exist`, alreadyExists });
    }
    if (notFound.length > 0) {
      throw new NotFoundException({ success: false, message: `${notFound.join(', ')} not found`, notFound });
    }

    const createdUsers: unknown[] = [];
    for (const gid of groupIds) {
      const group = await this.repo.findFleetVehicleGroupById(gid);
      if (!group) continue;

      const existingVendorUser = await this.repo.findVendorUserByFleetGroupAndVendor(group.id, vendorId);
      if (existingVendorUser) continue;

      const vendorUser = await this.repo.createVendorUser({ fleetGroupId: group.id, userTypeId, vendorId, clientId });
      const createdRecord = await this.repo.findVendorUserWithFleetGroup(group.id, userTypeId, vendorUser.vendorId);
      createdUsers.push(createdRecord);
    }

    if (createdUsers.length === 0) {
      throw new BadRequestException({ success: false, message: 'groups Already exists' });
    }

    return { success: true, message: 'Groups added successfully', data: createdUsers };
  }

  private async assignUsers(userTypeId: number, vendorId: number, clientId: number, userIds: string[]) {
    const alreadyExists: string[] = [];
    const notFound: string[] = [];

    for (const uid of userIds) {
      const user = await this.repo.findUserByUserId(uid);
      if (!user) {
        notFound.push(uid);
        continue;
      }
      const check = await this.repo.findVendorUserByUserAndVendor(user.id, vendorId);
      if (check) alreadyExists.push(uid);
    }

    if (alreadyExists.length > 0) {
      throw new BadRequestException({ success: false, message: `Users ${alreadyExists.join(', ')} already exist`, alreadyExists });
    }
    if (notFound.length > 0) {
      throw new NotFoundException({ success: false, message: `${notFound.join(', ')} not found`, notFound });
    }

    const createdUsers: unknown[] = [];
    for (const uid of userIds) {
      const user = await this.repo.findUserByUserId(uid);
      if (!user) continue;

      const existingVendorUser = await this.repo.findVendorUserByUserAndVendor(user.id, vendorId);
      if (existingVendorUser) continue;

      const vendorUser = await this.repo.createVendorUser({ userId: user.id, userTypeId, vendorId, clientId });
      const createdRecord = await this.repo.findVendorUserWithUser(user.id, userTypeId, vendorUser.vendorId);
      createdUsers.push(createdRecord);
    }

    if (createdUsers.length === 0) {
      throw new BadRequestException({ success: false, message: 'users Already exists' });
    }

    return { success: true, message: 'Member added successfully', data: createdUsers };
  }

  async getAllUserVendorUserTypes(userTypeId: number, vendorId: number) {
    const vendorUsers = await this.repo.findAssignedVendorUsersByVendor(userTypeId, vendorId);
    return { success: true, message: 'Vendor users fetched successfully', data: vendorUsers };
  }

  async deleteVendorUser(id: number, vendorId: number) {
    const vendorUser = await this.repo.findVendorUserByIdAndVendor(id, vendorId);
    if (!vendorUser) {
      throw new NotFoundException({ success: false, message: 'Vendor group not found' });
    }
    await this.repo.deleteVendorUser(id);
    return { success: true, message: 'Group removed successfully' };
  }

  async getAllChargers(vendorId: number) {
    const chargers = await this.repo.findChargersByVendorWithStandardTariff(vendorId);
    return { success: true, message: 'Chargers fetched successfully', data: chargers };
  }
}
