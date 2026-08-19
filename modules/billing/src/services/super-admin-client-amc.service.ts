import { BadRequestException, Injectable } from '@nestjs/common';
import { getIstDateRangeInUtc } from '@app/common';
import { SuperAdminClientAmcRepository } from '../repositories/super-admin-client-amc.repository';
import { SuperAdminClientAmcQueryDto, RenewClientAmcDto } from '../dto/super-admin-client-amc.dto';

/** Mirrors `controllers/suparAdmin/clientAmcController.js`. */
@Injectable()
export class SuperAdminClientAmcService {
  constructor(private readonly repo: SuperAdminClientAmcRepository) {}

  async getAllClientsAmcs(query: SuperAdminClientAmcQueryDto) {
    const data = await this.repo.findAllClientsWithLatestAmc(query.search, query.status);
    return { success: true, message: 'Client AMCs fetched successfully', data };
  }

  async getClientAMCbyclientId(clientId: number) {
    const amc = await this.repo.findLatestAmcByClientId(clientId);
    return { success: true, message: 'Client AMC fetched successfully', data: amc };
  }

  async renewClientAMC(dto: RenewClientAmcDto) {
    if (new Date(dto.endDate) <= new Date(dto.startDate)) {
      throw new BadRequestException({ success: false, message: 'End date must be greater than start date' });
    }

    const previousAmc = await this.repo.findLatestAmcByClient(dto.clientId);
    await this.repo.expireActiveAmcsForClient(dto.clientId);

    const { startDate: start, endDate: end } = getIstDateRangeInUtc(dto.startDate, dto.endDate);

    const newAmc = await this.repo.createAmc({
      clientId: dto.clientId,
      startDate: start,
      endDate: end,
      total_amc_hours: dto.standard_amc_hours ?? previousAmc?.standard_amc_hours ?? undefined,
      remaining_amc_hours: dto.standard_amc_hours ?? previousAmc?.standard_amc_hours ?? undefined,
      charger_amc_count: dto.charger_amc_count ?? previousAmc?.charger_amc_count ?? undefined,
      chargers_for_increment: dto.chargers_for_increment ?? previousAmc?.chargers_for_increment ?? undefined,
      increment_hours: dto.increment_hours ?? previousAmc?.increment_hours ?? undefined,
      status: 'Active',
    });

    return { success: true, message: 'Client AMC renewed successfully', data: newAmc };
  }

  async cardStacks() {
    const today = new Date();
    const nextMonth = new Date();
    nextMonth.setDate(nextMonth.getDate() + 30);

    const [
      totalClients,
      totalActiveAmcs,
      totalExpiredAmcs,
      totalActiveChargerAmcs,
      totalExpiredChargerAmcs,
      totalChargers,
      expiringClients,
      expiringChargerClients,
      onboardedChargers,
    ] = await Promise.all([
      this.repo.countClientDetails(),
      this.repo.countClientAmcsByStatus('Active'),
      this.repo.countExpiredAmcsLatestPerClient(),
      this.repo.countClientChargerAmcsByStatus('Active'),
      this.repo.countExpiredChargerAmcsLatestPerCharger(),
      this.repo.countChargers(),
      this.repo.countClientAmcsExpiringBetween(today, nextMonth),
      this.repo.countClientChargerAmcsExpiringBetween(today, nextMonth),
      this.repo.countClientChargerAmcsByStatus('Onboarded'),
    ]);

    return {
      success: true,
      message: 'Card stacks fetched successfully',
      data: {
        totalClients,
        totalActiveAmcs,
        totalExpiredAmcs,
        totalActiveChargerAmcs,
        totalExpiredChargerAmcs,
        totalChargers,
        expiringClients,
        expiringChargerClients,
        onboardedChargers,
      },
    };
  }

  async chargerStatusCount(clientId: number) {
    const today = new Date();
    const nextMonth = new Date();
    nextMonth.setDate(nextMonth.getDate() + 30);

    const [activeChargers, onboardedChargers, testChargers, expiredChargers, acChargerCount, dcChargerCount] = await Promise.all([
      this.repo.countClientChargerAmcsByClientAndStatus(clientId, 'Active'),
      this.repo.countClientChargerAmcsByClientAndStatus(clientId, 'Onboarded'),
      this.repo.countClientChargerAmcsByClientAndStatus(clientId, 'Test'),
      this.repo.countExpiredChargerAmcsLatestPerChargerForClient(clientId),
      this.repo.countChargersByClientAndPowerType(clientId, 'AC'),
      this.repo.countChargersByClientAndPowerType(clientId, 'DC'),
    ]);

    // Legacy never awaits this count (`const expiringChargers = ClientChargerAmc.count({...})`
    // with no `await`), so the response field serializes as `{}` — preserved exactly.
    const expiringChargers = this.repo.countClientChargerAmcsExpiringBetweenForClient(clientId, today, nextMonth);

    return {
      success: true,
      message: 'Charger status count fetched successfully',
      data: {
        activeChargers,
        expiredChargers,
        onboardedChargers,
        testChargers,
        expiringChargers,
        acChargerCount,
        dcChargerCount,
        totalChargers: acChargerCount + dcChargerCount || 0,
      },
    };
  }
}
