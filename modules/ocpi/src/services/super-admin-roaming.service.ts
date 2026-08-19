import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { AdminRoamingRepository } from '../repositories/admin-roaming.repository';
import { SuperAdminAddImportRoamingDto, SuperAdminUpdateRoamingTariffDto, ConnectClientToInternalRoamingDto } from '../dto/super-admin-roaming.dto';

/** Mirrors `controllers/suparAdmin/InternalRoaming/charger.controller.js` + `clients.controller.js`. Cross-client: exportClientId/importClientId are always taken from the request body/params, never from an authenticated actor. */
@Injectable()
export class SuperAdminRoamingService {
  constructor(private readonly repo: AdminRoamingRepository) {}

  async addImportRoaming(dto: SuperAdminAddImportRoamingDto) {
    const { exportClientId, importClientId, chargers } = dto;

    const roaming = await this.repo.findRoamingClientByImportExport(importClientId, exportClientId);
    if (roaming && roaming.status === 'BLOCKED') {
      throw new BadRequestException({ success: false, message: 'Roaming client is blocked' });
    }
    if (!roaming) {
      throw new NotFoundException({ success: false, message: 'Roaming client not found' });
    }

    for (const chargerData of chargers) {
      const { chargerId, roamingPrice, roamingGst } = chargerData;

      const charger = await this.repo.findChargerByIdAndClient(chargerId, exportClientId);
      if (!charger) {
        throw new NotFoundException({ success: false, message: `Charger ${chargerId} not found` });
      }

      const existingInternalRoaming = await this.repo.findInternalRoaming(exportClientId, importClientId, chargerId, roaming.id);
      const existingTariff = await this.repo.findRoamingTariff(chargerId, exportClientId, importClientId);

      if (!existingTariff) {
        let price = roamingPrice;
        let gst = roamingGst;

        if (price == null) {
          const generalTariff = await this.repo.findGeneralTariff(chargerId, exportClientId);
          if (!generalTariff) {
            throw new NotFoundException({ success: false, message: `General tariff not found for charger ${chargerId}` });
          }
          price = generalTariff.price ?? undefined;
          gst = generalTariff.gst ?? undefined;
        }

        await this.repo.createRoamingTariff({
          chargerId,
          clientId: exportClientId,
          importClientId,
          vendorId: charger.vendorId,
          price,
          gst: gst || 18,
        });
      }

      if (existingInternalRoaming) {
        continue;
      }

      await this.repo.createInternalRoaming({ exportClientId, importClientId, chargerId, roamingId: roaming.id });
    }

    return { success: true, message: 'Internal Roaming added successfully' };
  }

  async updateRoamingTariff(dto: SuperAdminUpdateRoamingTariffDto) {
    const existingTariff = await this.repo.findRoamingTariff(dto.chargerId, dto.exportClientId, dto.importClientId);
    if (!existingTariff) {
      throw new NotFoundException({ success: false, message: `Tariff not found for charger ${dto.chargerId}` });
    }

    await this.repo.updateRoamingTariff(existingTariff.id, { price: dto.roamingPrice, gst: dto.roamingGst });
    return { success: true, message: 'Tariff updated successfully' };
  }

  async getAllImportingClients(exceptClientId: number) {
    const clients = await this.repo.findImportingClients(exceptClientId);
    return { success: true, message: 'Clients fetched successfully', data: clients };
  }

  async getAllChargerByClientId(
    importClientId: number,
    exportClientId: number,
    query: { search?: string; page?: string; limit?: string; isRoaming?: string },
  ) {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 10;
    const skip = (page - 1) * limit;
    const isRoaming = query.isRoaming === 'true';

    const existingChargers = await this.repo.findInternalRoamingChargerIds(exportClientId, importClientId);
    const chargerIds = existingChargers.map((c) => c.chargerId);

    const [rows, count] = await this.repo.findAndCountExportableChargers(exportClientId, importClientId, chargerIds, isRoaming, query.search, skip, limit);

    return {
      success: true,
      message: 'Chargers fetched successfully',
      data: rows,
      pagination: { page, limit, total: count, totalPages: Math.ceil(count / limit) },
    };
  }

  async connectedClient(importClientId: number, exportClientId: number) {
    const roamingClient = await this.repo.findRoamingClientByImportExport(importClientId, exportClientId);
    if (!roamingClient) {
      throw new NotFoundException({ success: false, message: 'Roaming client not connected' });
    }
    return { success: true, message: 'Clients fetched successfully', data: roamingClient };
  }

  async connectClientToInternalRoaming(dto: ConnectClientToInternalRoamingDto) {
    const { exportClientId, importClientId } = dto;

    if (exportClientId === importClientId) {
      throw new BadRequestException({ success: false, message: 'Export and Import client cannot be the same' });
    }
    if (!exportClientId || !importClientId) {
      throw new BadRequestException({ success: false, message: 'Export and Import client IDs are required' });
    }

    const existingRoaming = await this.repo.findRoamingClientByImportExport(importClientId, exportClientId);
    if (existingRoaming) {
      throw new BadRequestException({ success: false, message: 'Internal Roaming client already connected' });
    }

    const exportFeature = await this.repo.findClientFeatureByName('Nexin Roaming Export');
    const importFeature = await this.repo.findClientFeatureByName('Nexin Roaming Import');
    // Legacy dereferences .id unguarded — these are seeded, always-present features; preserved as-is.
    const exportClientFeature = await this.repo.findClientFeatureMapping(exportClientId, exportFeature!.id);
    const importClientFeature = await this.repo.findClientFeatureMapping(importClientId, importFeature!.id);

    if (!exportClientFeature || !importClientFeature) {
      throw new BadRequestException({
        success: false,
        message: !exportClientFeature ? 'Export client feature not found' : 'Import client feature not found',
      });
    }

    await this.repo.createRoamingClient({ importClientId, exportClientId, joinedAt: new Date(), status: 'ACTIVE' });
    return { success: true, message: 'Internal Roaming client connected successfully' };
  }
}
