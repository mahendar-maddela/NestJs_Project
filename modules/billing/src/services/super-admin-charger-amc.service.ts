import { Injectable, NotFoundException } from '@nestjs/common';
import { getIstDateRangeInUtc } from '@app/common';
import { SuperAdminChargerAmcRepository, ChargerAmcListFilters } from '../repositories/super-admin-charger-amc.repository';
import { SuperAdminChargerAmcQueryDto, RenewClientChargerAmcDto } from '../dto/super-admin-charger-amc.dto';

/** Mirrors `controllers/suparAdmin/chargerClientAmcController.js`. */
@Injectable()
export class SuperAdminChargerAmcService {
  constructor(private readonly repo: SuperAdminChargerAmcRepository) {}

  private buildFilters(query: SuperAdminChargerAmcQueryDto): ChargerAmcListFilters {
    return {
      status: query.status,
      search: query.search,
      vendorId: query.vendorId ? Number(query.vendorId) : undefined,
    };
  }

  private async attachLatestAmc(rows: any[]) {
    const chargerIds = rows.map((r) => r.id);
    const latestByCharger = await this.repo.findLatestAmcsByChargerIds(chargerIds);
    return rows.map((row) => ({ ...row, clientChargerAmcs: latestByCharger.has(row.id) ? [latestByCharger.get(row.id)] : [] }));
  }

  async getAllClientChargers(query: SuperAdminChargerAmcQueryDto) {
    const page = query.page ? parseInt(query.page, 10) : 1;
    const limit = query.limit ? parseInt(query.limit, 10) : 10;
    const skip = (page - 1) * limit;

    const [rows, count] = await this.repo.findAndCountAllChargersWithAmc(this.buildFilters(query), skip, limit);
    const data = await this.attachLatestAmc(rows);

    return { success: true, message: 'Chargers fetched successfully', data, pagination: { totalPages: Math.ceil(count / limit), page } };
  }

  async getAllClientChargersByClientId(clientId: number, query: SuperAdminChargerAmcQueryDto) {
    const page = query.page ? parseInt(query.page, 10) : 1;
    const limit = query.limit ? parseInt(query.limit, 10) : 10;
    const skip = (page - 1) * limit;

    const [rows, count] = await this.repo.findAndCountChargersByClientWithAmc(clientId, this.buildFilters(query), skip, limit);
    const data = await this.attachLatestAmc(rows);

    return { success: true, message: 'Chargers fetched successfully', data, pagination: { totalPages: Math.ceil(count / limit), page } };
  }

  // Legacy imports `renewClientChargerAMCValidation` but never wires it to this route (unlike the
  // client-amc renewal endpoint, which does) — no date-range validation replicated here.
  async renewClientChargerAmc(chargerId: number, dto: RenewClientChargerAmcDto) {
    return this.repo.runRenewalTransaction(async ({ charger: chargerRepo, clientChargerAmc: clientChargerAmcRepo, clientAmc: clientAmcRepo }) => {
      const charger = await chargerRepo.findOne({ where: { id: chargerId }, select: { id: true, clientId: true } });
      if (!charger) {
        throw new NotFoundException({ success: false, message: 'Charger not found' });
      }

      const onboardedCharger = await clientChargerAmcRepo.findOne({ where: { chargerId, status: 'Onboarded' } });
      const { startDate: start, endDate: end } = getIstDateRangeInUtc(dto.startDate, dto.endDate);

      if (onboardedCharger) {
        await clientChargerAmcRepo.update(onboardedCharger.id, {
          status: (dto.status as any) || 'Active',
          startDate: start,
          endDate: end,
          paid_amount: dto.paid_amount as any,
          amount_per_annum: dto.amount_per_annum as any,
        });

        const clientAmc = await clientAmcRepo.findOne({ where: { clientId: charger.clientId, status: 'Active' }, order: { createdAt: 'DESC' } });

        if (clientAmc) {
          const totalAmcHours = clientAmc.total_amc_hours || clientAmc.standard_amc_hours || 0;
          const remainingAmcHours = clientAmc.remaining_amc_hours || 0;
          const chargerAmcCount = clientAmc.charger_amc_count || 0;
          const chargersForIncrement = clientAmc.chargers_for_increment || 0;
          const incrementHours = clientAmc.increment_hours || 0;

          const totalCreatedChargers = await clientChargerAmcRepo.count({ where: { clientId: charger.clientId } });

          if (totalCreatedChargers > chargerAmcCount && chargersForIncrement > 0) {
            const extraChargers = totalCreatedChargers - chargerAmcCount;
            const increments = Math.floor(extraChargers / chargersForIncrement);
            const totalIncrementHours = increments * incrementHours;

            const alreadyApplied = clientAmc.applied_increment_hours || 0;
            const newIncrement = totalIncrementHours - alreadyApplied;

            if (newIncrement > 0) {
              let newTotalHours = totalAmcHours + newIncrement;
              let newRemainingHours = remainingAmcHours + newIncrement;
              let unbilledHours = clientAmc.unbilled_hours || 0;

              if (unbilledHours > 0) {
                if (newRemainingHours >= unbilledHours) {
                  newRemainingHours -= unbilledHours;
                  unbilledHours = 0;
                } else {
                  unbilledHours -= newRemainingHours;
                  newRemainingHours = 0;
                }
              }

              await clientAmcRepo.update(clientAmc.id, {
                total_amc_hours: newTotalHours,
                remaining_amc_hours: newRemainingHours,
                unbilled_hours: unbilledHours,
                applied_increment_hours: totalIncrementHours,
              });
            }
          }
        }
      } else {
        await clientChargerAmcRepo.update({ chargerId, clientId: charger.clientId, status: 'Active' } as any, { status: 'Expired' });

        await clientChargerAmcRepo.save(
          clientChargerAmcRepo.create({
            clientId: charger.clientId,
            chargerId,
            startDate: start,
            endDate: end,
            status: (dto.status as any) || 'Active',
            paid_amount: dto.paid_amount as any,
            amount_per_annum: dto.amount_per_annum as any,
          }),
        );
      }

      return { success: true, message: 'Charger AMC renewed successfully' };
    });
  }

  async getChargerAmcHistoryById(chargerId: number, page: number, limit: number) {
    const skip = (page - 1) * limit;
    const [rows, count] = await this.repo.findAndCountAmcHistory(chargerId, skip, limit);

    return {
      success: true,
      message: 'Charger AMC history fetched successfully',
      data: rows,
      pagination: { totalPages: Math.ceil(count / limit), page },
    };
  }
}
