import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { FleetAssignedDriverRepository } from '../repositories/fleet-assigned-driver.repository';
import { AssignDriverToVehicleDto } from '../dto/fleet-assigned-driver.dto';

function normalizeTime(time: string | undefined): string | undefined {
  return time?.length === 5 ? `${time}:00` : time;
}

/** Mirrors `controllers/Fleet/vehicleDriveController.js`. */
@Injectable()
export class FleetAssignedDriverService {
  constructor(private readonly repo: FleetAssignedDriverRepository) {}

  async assignDriverToVehicle(fleetId: number, clientId: number, dto: AssignDriverToVehicleDto) {
    const { driverId, vehicleData: vehicleId, startDate, startTime, endTime } = dto;
    const normalizedStartTime = normalizeTime(startTime);
    const normalizedEndTime = normalizeTime(endTime);

    if (!driverId || !vehicleId || !startDate || !normalizedStartTime || !normalizedEndTime) {
      throw new BadRequestException({ success: false, message: 'Missing required fields' });
    }

    const driver = await this.repo.findDriverByIdFleetClient(driverId, fleetId, clientId);
    if (!driver) {
      throw new NotFoundException({ success: false, message: 'Driver not found' });
    }

    const vehicle = await this.repo.findVehicleByIdFleetClient(vehicleId, fleetId, clientId);
    if (!vehicle) {
      throw new NotFoundException({ success: false, message: 'Vehicle not found' });
    }

    const vehicleConflict = await this.repo.findVehicleTimeOverlap(vehicleId, startDate, normalizedStartTime, normalizedEndTime);
    if (vehicleConflict) {
      throw new BadRequestException({ success: false, message: 'Vehicle already assigned during this time slot' });
    }

    const driverConflict = await this.repo.findDriverTimeOverlap(driverId, startDate, normalizedStartTime, normalizedEndTime);
    if (driverConflict) {
      throw new BadRequestException({ success: false, message: 'Driver already assigned to another vehicle during this time slot' });
    }

    const assignment = await this.repo.createAssignment({
      fleetDriverId: driverId,
      vehicleId,
      startDate: new Date(startDate),
      startTime: normalizedStartTime,
      endTime: normalizedEndTime,
      endDate: null,
      status: 'Assigned',
      clientId,
    });

    return { success: true, message: 'Driver assigned to vehicle successfully', data: assignment };
  }

  async closeAssignedVehicle(assignmentId: number, clientId: number) {
    const assignment = await this.repo.findAssignmentByIdStatusClient(assignmentId, 'Assigned', clientId);
    if (!assignment) {
      throw new NotFoundException({ success: false, message: 'Assignment not found' });
    }

    const updated = await this.repo.closeAssignment(assignmentId);
    return { success: true, message: 'Vehicle assignment closed successfully', data: updated };
  }

  async driverAssignedAllHistory(vehicleId: number, clientId: number, status?: string) {
    const driver = await this.repo.findAssignmentHistoryByVehicle(vehicleId, status, clientId);
    if (driver.length === 0) {
      throw new NotFoundException({ success: false, message: 'No driver assignment history found' });
    }
    return { success: true, message: 'sucessfully Fetched', data: driver };
  }

  async vehicleDeviceTransactionHistory(vehicleId: number) {
    const sessions = await this.repo.findDeviceTransactionsByVehicle(vehicleId);
    return { success: true, data: sessions };
  }
}
