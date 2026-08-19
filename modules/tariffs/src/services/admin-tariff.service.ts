import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { AdminTariffRepository } from '../repositories/admin-tariff.repository';
import { CreateTariffDto, UpdateTariffDto, AssignVendorUserOrGroupDto } from '../dto/admin-tariff.dto';

/** Mirrors `controllers/admin/tariffController.js`. */
@Injectable()
export class AdminTariffService {
  constructor(private readonly repo: AdminTariffRepository) {}

  async createTariffAdmin(clientId: number, staffId: number, dto: CreateTariffDto) {
    const { vendorId, name, startDate, endDate, chargers = [] } = dto;

    if (!name || !startDate || !endDate || !vendorId || chargers.length === 0) {
      throw new BadRequestException({ success: false, message: 'Name, Start Date, End Date and Chargers are required fields' });
    }

    const standard = await this.repo.createUserType({ name, vendorId, clientId, startDate: new Date(startDate), endDate: new Date(endDate) });

    const newTariffs = await Promise.all(
      chargers.map(async (charger) => {
        if (!charger.price) return null;
        const standardTariff = await this.repo.findStandardTariffByCharger(charger.chargerId);
        return this.repo.createTariff({
          userTypeId: standard.id,
          vendorId,
          chargerId: charger.chargerId,
          price: charger.price,
          gst: standardTariff?.gst ?? null,
          staffId,
          clientId,
        });
      }),
    );

    return { success: true, message: 'Tariff created successfully', data: { tariff: newTariffs } };
  }

  async getAllTariffByVendor(vendorId: number, clientId: number) {
    const tariffs = await this.repo.findUserTypesByVendor(vendorId, clientId);
    return { success: true, message: 'Tariffs fetched successfully', data: tariffs };
  }

  async getTariffById(userTypeId: number, clientId: number) {
    const tariff = await this.repo.findUserTypeWithTariffsById(userTypeId, clientId);
    if (!tariff) {
      throw new NotFoundException({ success: false, message: 'Tariff not found' });
    }

    const chargerIds = (tariff.tariffs || []).map((t: any) => t.charger?.id).filter(Boolean);
    const standardTariffs = chargerIds.length
      ? await Promise.all(chargerIds.map((id: number) => this.repo.findStandardTariffByCharger(id)))
      : [];
    const standardByCharger = new Map<number, any>();
    chargerIds.forEach((id: number, i: number) => {
      if (standardTariffs[i]) standardByCharger.set(id, standardTariffs[i]);
    });

    const data = {
      ...tariff,
      tariffs: (tariff.tariffs || []).map((t: any) => ({
        ...t,
        charger: t.charger
          ? { ...t.charger, tariff: standardByCharger.has(t.charger.id) ? [standardByCharger.get(t.charger.id)] : [] }
          : t.charger,
      })),
    };

    return { success: true, message: 'Tariff details fetched successfully', data };
  }

  async updateTariffAdmin(userTypeId: number, clientId: number, dto: UpdateTariffDto) {
    const { vendorId, name, startDate, endDate, chargers = [] } = dto;

    const userType = await this.repo.findUserTypeByIdVendorClient(userTypeId, vendorId, clientId);
    if (!userType) {
      throw new NotFoundException({ success: false, message: 'Tariff not found' });
    }

    await this.repo.updateUserType(userTypeId, {
      name,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
    });

    for (const charger of chargers) {
      const existing = await this.repo.findTariffByUserTypeCharger(userTypeId, charger.chargerId, vendorId, clientId);
      if (existing) {
        await this.repo.updateTariff(existing.id, {
          price: charger.price ?? existing.price,
          gst: charger.gst ?? existing.gst,
        });
      } else if (charger.price) {
        const standardPrice = await this.repo.findStandardTariffByChargerVendorClient(charger.chargerId, vendorId, clientId);
        await this.repo.createTariff({
          userTypeId,
          vendorId,
          chargerId: charger.chargerId,
          price: charger.price,
          gst: charger.gst ?? standardPrice?.gst ?? 0,
          clientId,
        });
      }
    }

    return { success: true, message: 'Tariff updated successfully' };
  }

  async deleteTariffAdmin(userTypeId: number, clientId: number) {
    const userType = await this.repo.findUserTypeByIdAndClient(userTypeId, clientId);
    if (!userType) {
      throw new NotFoundException({ success: false, message: 'Tariff not found' });
    }

    await this.repo.deleteVendorUsersByUserType(userTypeId);
    await this.repo.deleteTariffsByUserType(userTypeId);
    await this.repo.deleteUserType(userTypeId);

    return { success: true, message: 'Tariff deleted successfully' };
  }

  async assignUserOrGroupsVendorUserType(userTypeId: number, clientId: number, dto: AssignVendorUserOrGroupDto) {
    const { userIds = [], vendorId, groupIds = [] } = dto;

    if (userTypeId !== parseInt(dto.userTypeI, 10)) {
      throw new BadRequestException({ success: false, message: 'User Type ID mismatch' });
    }
    if (userIds.length > 0 && groupIds.length > 0) {
      throw new BadRequestException({ success: false, message: 'Provide either userIds or groupIds, not both' });
    }
    if (userIds.length === 0 && groupIds.length === 0) {
      throw new BadRequestException({ success: false, message: 'Either userIds or groupIds is required' });
    }

    if (groupIds.length > 0) {
      return this.assignGroups(userTypeId, clientId, vendorId, groupIds);
    }
    return this.assignUsers(userTypeId, clientId, vendorId, userIds);
  }

  private async assignGroups(userTypeId: number, clientId: number, vendorId: number, groupIds: number[]) {
    const alreadyExists: string[] = [];
    const notFound: number[] = [];

    for (const gid of groupIds) {
      const group = await this.repo.findFleetVehicleGroupById(gid);
      if (!group) {
        notFound.push(gid);
        continue;
      }
      const check = await this.repo.findVendorUserByFleetGroupAndVendor(group.id, vendorId);
      if (check) alreadyExists.push(group.groupId || String(group.id));
    }

    if (alreadyExists.length > 0) {
      throw new BadRequestException({ success: false, message: `Groups ${alreadyExists.join(', ')} already exist in other tariff`, alreadyExists });
    }
    if (notFound.length > 0) {
      throw new NotFoundException({ success: false, message: `${notFound.join(', ')} not found`, notFound });
    }

    const createdUsers: any[] = [];
    for (const gid of groupIds) {
      const group = await this.repo.findFleetVehicleGroupById(gid);
      if (!group) continue;

      const existingVendorUser = await this.repo.findVendorUserByFleetGroupVendorClient(group.id, vendorId, clientId);
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

  private async assignUsers(userTypeId: number, clientId: number, vendorId: number, userIds: string[]) {
    const alreadyExists: string[] = [];
    const notFound: string[] = [];

    for (const uid of userIds) {
      const user = await this.repo.findUserByUserId(uid);
      if (!user) {
        notFound.push(uid);
        continue;
      }
      const check = await this.repo.findVendorUserByUserAndVendor(user.id, vendorId);
      if (check) alreadyExists.push(user.userId || String(user.id));
    }

    if (alreadyExists.length > 0) {
      throw new BadRequestException({ success: false, message: `Users ${alreadyExists.join(', ')} already exist in other tariff`, alreadyExists });
    }
    if (notFound.length > 0) {
      throw new NotFoundException({ success: false, message: `${notFound.join(', ')} not found`, notFound });
    }

    const createdUsers: any[] = [];
    for (const uid of userIds) {
      const user = await this.repo.findUserByUserId(uid);
      if (!user) continue;

      const existingVendorUser = await this.repo.findVendorUserByUserVendorClient(user.id, vendorId, clientId);
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

  async getAllAssignedUserVendorUserTypes(userTypeId: number, clientId: number) {
    const vendorUsers = await this.repo.findAssignedVendorUsers(userTypeId, clientId);
    return { success: true, message: 'Vendor users fetched successfully', data: vendorUsers };
  }

  async deleteVendorUserAdmin(id: number, clientId: number) {
    const vendorUser = await this.repo.findVendorUserByIdAndClient(id, clientId);
    if (!vendorUser) {
      throw new NotFoundException({ success: false, message: 'Vendor group not found' });
    }
    await this.repo.deleteVendorUser(id);
    return { success: true, message: 'Group removed successfully' };
  }

  async getAllChargersByVendorId(vendorId: number, clientId: number) {
    const chargers = await this.repo.findChargersByVendorWithStandardTariff(vendorId, clientId);
    return { success: true, message: 'Chargers fetched successfully', data: chargers };
  }
}
