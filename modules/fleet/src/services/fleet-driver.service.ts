import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { AdminDriverRepository } from '../repositories/admin-driver.repository';
import { CreateFleetDriverDto, UpdateFleetDriverDto } from '../dto/fleet-driver.dto';

/** Mirrors `controllers/Fleet/driverController.js`. */
@Injectable()
export class FleetDriverService {
  constructor(private readonly repo: AdminDriverRepository) {}

  async createFleetDriver(fleetId: number, clientId: number, dto: CreateFleetDriverDto) {
    const existingDriver = await this.repo.findExistingDriverByEmailOrPhone(fleetId, clientId, undefined, dto.phone);
    if (existingDriver) {
      throw new BadRequestException({ success: false, message: 'Driver with provided phone already exists' });
    }

    const driverCount = await this.repo.countDriversByFleet(fleetId, clientId);

    const newDriver = await this.repo.createDriver({
      fleetId,
      name: dto.name,
      phone: dto.phone,
      email: dto.email,
      licenseNumber: dto.licenseNumber,
      aadharNumber: dto.aadharNumber,
      panNumber: dto.panNumber,
      address: dto.address,
      type: 'DRIVER',
      clientId,
    });

    const prefixConfigValue = await this.repo.findPrefixConfig(clientId);
    const uid = driverCount + 1;
    const drIdFormat = `${prefixConfigValue?.driver ?? ''}${String(uid).padStart(5, '0')}`;
    await this.repo.updateDriverDrId(newDriver.id, drIdFormat);

    return { success: true, driver: { ...newDriver, drId: drIdFormat }, message: 'Driver created successfully' };
  }

  async getAllDrivers(fleetId: number, clientId: number, page: number | undefined, limit: number | undefined, search: string | undefined) {
    if (!page && !limit) {
      const drivers = await this.repo.findAllDriversByFleetSearch(fleetId, clientId, search);
      return { success: true, message: 'drivers fetched successfully', data: drivers };
    }

    const skip = (page! - 1) * limit!;
    const [rows, count] = await this.repo.findAndCountDriversByFleetSearch(fleetId, clientId, search, skip, limit!);

    return {
      success: true,
      message: 'Fleet drivers fetched successfully',
      data: rows,
      pagination: { totalItems: count, totalPages: Math.ceil(count / limit!), currentPage: page },
    };
  }

  async getDriverById(id: number, clientId: number) {
    const driver = await this.repo.findDriverByIdAndClient(id, clientId);
    if (!driver) {
      throw new NotFoundException({ success: false, message: 'Driver not found' });
    }

    const stats = await this.repo.findDriverSessionStats(id);
    return { success: true, message: 'Driver fetched successfully', data: { driver, stats } };
  }

  async updateFleetDriver(driverId: number, clientId: number, dto: UpdateFleetDriverDto) {
    const driver = await this.repo.findDriverByIdAndClient(driverId, clientId);
    if (!driver) {
      throw new NotFoundException({ success: false, message: 'Driver not found' });
    }

    const updated = await this.repo.updateDriver(driverId, {
      name: dto.name ?? driver.name,
      phone: dto.phone ?? driver.phone,
      email: dto.email ?? driver.email,
      licenseNumber: dto.licenseNumber ?? driver.licenseNumber,
      aadharNumber: dto.aadharNumber ?? driver.aadharNumber,
      panNumber: dto.panNumber ?? driver.panNumber,
      address: dto.address ?? driver.address,
      status: (dto.status as any) ?? driver.status,
    });

    return { success: true, message: 'Driver updated successfully', data: updated };
  }

  async driverAssignedHistory(id: number, fleetId: number, clientId: number, page: number, limit: number) {
    const driver = await this.repo.findDriverByIdAndClient(id, clientId);
    if (!driver || driver.fleetId !== fleetId) {
      throw new NotFoundException({ success: false, message: 'Driver not found' });
    }

    const skip = (page - 1) * limit;
    const [rows, count] = await this.repo.findAndCountAssignmentHistory(id, clientId, skip, limit);

    return {
      success: true,
      message: 'Successfully fetched driver assignment history',
      data: rows,
      pagination: { totalRecords: count, currentPage: page, totalPages: Math.ceil(count / limit), pageSize: limit },
    };
  }

  async driverChargingSessionHistory(driverId: number) {
    const driverSessions = await this.repo.findChargingSessionsByDriver(driverId);
    return { success: true, message: 'Driver charging sessions fetched successfully', data: driverSessions };
  }
}
