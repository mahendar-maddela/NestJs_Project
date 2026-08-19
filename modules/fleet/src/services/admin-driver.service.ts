import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { AdminDriverRepository } from '../repositories/admin-driver.repository';
import { CreateDriverDto, UpdateDriverDto } from '../dto/admin-driver.dto';

/** Mirrors `controllers/admin/fleet/driverController.js`. */
@Injectable()
export class AdminDriverService {
  constructor(private readonly repo: AdminDriverRepository) {}

  async getAllDrivers(fleetId: number, clientId: number) {
    const drivers = await this.repo.findDriversByFleet(fleetId, clientId);
    return { success: true, message: 'Drivers fetched successfully', data: drivers };
  }

  async createDriver(clientId: number, dto: CreateDriverDto) {
    const existingDriver = await this.repo.findExistingDriverByEmailOrPhone(dto.fleetId, clientId, dto.email, dto.phone);
    if (existingDriver) {
      throw new BadRequestException({ success: false, message: 'Driver with provided email or phone already exists' });
    }

    const driverCount = await this.repo.countDriversByFleet(dto.fleetId, clientId);

    const newDriver = await this.repo.createDriver({
      fleetId: dto.fleetId,
      name: dto.name,
      email: dto.email,
      phone: dto.phone,
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

    return { success: true, message: 'Driver created successfully', data: { ...newDriver, drId: drIdFormat } };
  }

  async updateDriver(driverId: number, clientId: number, dto: UpdateDriverDto) {
    const driver = await this.repo.findDriverByIdAndClient(driverId, clientId);
    if (!driver) {
      throw new NotFoundException({ success: false, message: 'Driver not found' });
    }

    if (dto.status === 'Active') {
      const fleet = await this.repo.findFleetDetailByIdAndClient(driver.fleetId!, clientId);
      if (!fleet) {
        throw new NotFoundException({ success: false, message: 'Fleet not found' });
      }
      if (fleet.status === 'Block') {
        throw new BadRequestException({ success: false, message: 'Cannot update driver. Fleet is blocked.' });
      }
    }

    const updated = await this.repo.updateDriver(driverId, {
      name: dto.name,
      email: dto.email,
      phone: dto.phone,
      status: dto.status as any,
      licenseNumber: dto.licenseNumber,
      aadharNumber: dto.aadharNumber,
      panNumber: dto.panNumber,
      address: dto.address,
    });

    return { success: true, message: 'Driver updated successfully', data: updated };
  }
}
