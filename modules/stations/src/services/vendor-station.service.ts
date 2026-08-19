import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { AwsService } from '@integrations/aws';
import { VendorStationRepository } from '../repositories/vendor-station.repository';
import { Station } from '../entities/station.entity';
import { Location } from '../entities/location.entity';
import { StationAmenity } from '../entities/station-amenity.entity';
import { Media } from '../entities/media.entity';
import { StationStatus } from 'database/src';
import type { QueryDeepPartialEntity } from 'typeorm/query-builder/QueryPartialEntity';

function parseAmenityIds(raw: unknown): number[] | undefined {
  if (raw === undefined || raw === null) return undefined;
  if (Array.isArray(raw)) return raw.map(Number);
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed.map(Number);
    } catch {
      return raw.split(',').map((v) => Number(v.trim())).filter((n) => !isNaN(n));
    }
  }
  return undefined;
}

/** Mirrors `controllers/vendors/stationController.js`. */
@Injectable()
export class VendorStationService {
  constructor(
    private readonly repo: VendorStationRepository,
    private readonly awsService: AwsService,
  ) { }

  async getVendorStation(vendorId: number, page: number | undefined, limit: number | undefined) {
    if (!page && !limit) {
      const stations = await this.repo.findSimpleStationsByVendor(vendorId);
      return { success: true, message: 'Station fetched successfully', data: stations };
    }

    const skip = (page! - 1) * limit!;
    const { stations, count } = await this.repo.findPaginatedStationsWithChargerConnectors(vendorId, skip, limit!);

    const result = await Promise.all(
      stations.map(async (station: any) => {
        const connectorCounts: Record<string, number> = { Available: 0, Unavailable: 0, Faulted: 0, Engaged: 0 };
        for (const charger of station.chargers || []) {
          for (const connector of charger.connectors || []) {
            connectorCounts[connector.status] = (connectorCounts[connector.status] || 0) + 1;
          }
        }
        const connectorStatusCounts = Object.entries(connectorCounts).map(([status, cnt]) => ({ status, count: cnt }));

        const media = await this.repo.findMediaByStation(station.id);
        const mediaWithUrls = media.map((m) => ({
          ...m,
          url: this.awsService.getCloudfrontUrl(m.url ?? ''),
        }));
        const amenities = station.stationAmenities ? station.stationAmenities.map((sa: any) => sa.amenity) : [];

        return {
          ...station,
          amenities,
          stationLocation: station.stationLocation,
          stationMedia: mediaWithUrls,
          connectorStatusCounts,
        };
      }),
    );

    return {
      success: true,
      message: 'Stations fetched successfully',
      data: result,
      pagination: { totalPages: Math.ceil(count / limit!), page },
    };
  }

  async getVendorStationById(id: number, clientId: number) {
    const station = await this.repo.findStationById(id);
    if (!station || (station as any).clientId !== clientId) {
      throw new NotFoundException({ message: 'Station not found' });
    }

    const media = await this.repo.findMediaByStation(station.id);
    const mediaWithUrls = media.map((m) => ({
      ...m,
      url: this.awsService.getCloudfrontUrl(m.url ?? ''),
    }));

    const amenities = ((station as any).stationAmenities || []).map((sa: any) => sa.amenity);
    return {
      success: true,
      message: 'Station fetched successfully',
      data: {
        ...station,
        amenities,
        stationLocation: station.stationLocation,
        stationMedia: mediaWithUrls,
      },
    };
  }

  async vendorCreateStation(vendorId: number, clientId: number, empId: number, body: any, file: any) {
    const payload = body || {};

    const vendor = await this.repo.findVendorById(vendorId);
    const vendorStationCount = await this.repo.countStationsByVendor(vendorId);

    if (!vendor) {
      throw new NotFoundException({ message: 'Vendor not found' });
    }

    if (vendor.noOfStations !== null && vendor.noOfStations !== undefined && vendorStationCount >= vendor.noOfStations) {
      throw new BadRequestException({ message: 'Maximum number of stations reached for this vendor' });
    }

    let locationObj = payload.location || payload.stationLocation;
    if (typeof locationObj === 'string') {
      try {
        locationObj = JSON.parse(locationObj);
      } catch {
        // Leave as string if parsing fails
      }
    }

    const clientStationCount = await this.repo.countStationsByClient(clientId);
    const prefixConfig = await this.repo.findPrefixConfig(clientId);
    const uniqueId = `${prefixConfig?.station?.toUpperCase() || 'ST'}${(clientStationCount + 1).toString().padStart(5, '0')}`;
    const parsedAmenityIds = parseAmenityIds(payload.amenityIds);

    const parsedStatus = StationStatus.includes(payload.status) ? (payload.status as (typeof StationStatus)[number]) : 'Available';

    const newStation = await this.repo.runInTransaction(async (manager) => {
      const stationRepo = manager.getRepository(Station);
      const created = await stationRepo.save(
        stationRepo.create({
          name: payload.name ?? null,
          stationUniqueId: uniqueId,
          stationType: payload.stationType || 'Public',
          status: parsedStatus,
          helpNumber: payload.helpNumber ?? payload.stationHelpNumber ?? null,
          location: typeof locationObj === 'string' ? locationObj : locationObj?.address ?? null,
          vendorId,
          createdBy: empId,
          clientId,
        }),
      );

      if (locationObj && typeof locationObj === 'object') {
        const locationRepo = manager.getRepository(Location);
        await locationRepo.save(
          locationRepo.create({
            stationId: created.id,
            latitude: locationObj.latitude,
            longitude: locationObj.longitude,
            address: locationObj.address,
            city: locationObj.city,
            state: locationObj.state,
            country: locationObj.country,
            pincode: locationObj.pincode,
          }),
        );
      }

      if (parsedAmenityIds && parsedAmenityIds.length) {
        const stationAmenityRepo = manager.getRepository(StationAmenity);
        await stationAmenityRepo.save(
          parsedAmenityIds.map((amenityId: number) => stationAmenityRepo.create({ stationId: created.id, amenityId: Number(amenityId) })),
        );
      }

      return created;
    });

    if (file && typeof file !== 'function') {
      const rawName = file.filename || file.originalname || 'file';
      const cleanName = String(rawName).replace(/\s+/g, '_').toUpperCase();
      const fileName = `${Date.now()}-${cleanName}`;
      const folder = 'uploads/station';
      const key = `${folder}/${fileName}`;

      await this.awsService.uploadToS3(file, folder, fileName, file.mimetype || 'image/jpeg');

      await this.repo.runInTransaction(async (manager) => {
        const mediaRepo = manager.getRepository(Media);
        await mediaRepo.save(
          mediaRepo.create({
            mediable_id: newStation.id,
            mediable_type: 'station',
            url: key,
            entityType: 'Station',
            file_name: fileName,
          }),
        );
      });
    }

    const fullRes = await this.getVendorStationById(newStation.id, clientId);
    return { success: true, message: 'Station created successfully', data: fullRes.data };
  }

  async vendorUpdateStation(id: number, clientId: number, body: any, file: any) {
    const payload = body || {};
    const station = await this.repo.findStationById(id);
    if (!station || (station as any).clientId !== clientId) {
      throw new NotFoundException({ message: 'Station not found' });
    }

    let locationObj = payload.location || payload.stationLocation;
    if (typeof locationObj === 'string') {
      try {
        locationObj = JSON.parse(locationObj);
      } catch {
        // Leave as string if parsing fails
      }
    }

    const parsedAmenityIds = parseAmenityIds(payload.amenityIds);

    await this.repo.runInTransaction(async (manager) => {
      const stationRepo = manager.getRepository(Station);
      const updateData: QueryDeepPartialEntity<Station> = {};

      if (payload.name !== undefined) updateData.name = payload.name;
      if (payload.stationType !== undefined) updateData.stationType = payload.stationType;
      if (payload.status !== undefined && StationStatus.includes(payload.status)) {
        updateData.status = payload.status as (typeof StationStatus)[number];
      }
      if (payload.helpNumber !== undefined) {
        updateData.helpNumber = payload.helpNumber;
      } else if (payload.stationHelpNumber !== undefined) {
        updateData.helpNumber = payload.stationHelpNumber;
      }
      if (locationObj) {
        if (typeof locationObj === 'string') {
          updateData.location = locationObj;
        } else if (typeof locationObj === 'object' && locationObj.address) {
          updateData.location = locationObj.address;
        }
      }

      if (Object.keys(updateData).length > 0) {
        await stationRepo.update({ id }, updateData);
      }

      if (locationObj && typeof locationObj === 'object') {
        const locationRepo = manager.getRepository(Location);
        const existingLocation = await locationRepo.findOne({ where: { stationId: id } });
        const locData = {
          latitude: locationObj.latitude,
          longitude: locationObj.longitude,
          address: locationObj.address,
          city: locationObj.city,
          state: locationObj.state,
          country: locationObj.country,
          pincode: locationObj.pincode,
        };
        if (existingLocation) {
          await locationRepo.update({ id: existingLocation.id }, locData);
        } else {
          await locationRepo.save(locationRepo.create({ stationId: id, ...locData }));
        }
      }

      if (parsedAmenityIds !== undefined) {
        const stationAmenityRepo = manager.getRepository(StationAmenity);
        await stationAmenityRepo.delete({ stationId: id });
        if (parsedAmenityIds.length > 0) {
          await stationAmenityRepo.save(
            parsedAmenityIds.map((amenityId: number) => stationAmenityRepo.create({ stationId: id, amenityId: Number(amenityId) })),
          );
        }
      }
    });

    if (file && typeof file !== 'function') {
      const rawName = file.filename || file.originalname || 'file';
      const cleanName = String(rawName).replace(/\s+/g, '_').toUpperCase();
      const fileName = `${Date.now()}-${cleanName}`;
      const folder = 'uploads/station';
      const key = `${folder}/${fileName}`;

      // Upload new file to S3
      await this.awsService.uploadToS3(file, folder, fileName, file.mimetype || 'image/jpeg');

      await this.repo.runInTransaction(async (manager) => {
        const mediaRepo = manager.getRepository(Media);

        // Find existing media row matching the station and entityType
        const existFile = await mediaRepo.findOne({
          where: {
            mediable_id: id,
            mediable_type: 'station',
            entityType: 'Station',
          },
        });

        if (existFile) {
          // Construct old file path to delete from S3
          const oldFilePath = `uploads/${existFile.mediable_type}/${existFile.file_name}`;
          await this.awsService.deleteS3File(oldFilePath).catch(() => undefined);

          // Update the existing Media row
          await mediaRepo.update(existFile.id, {
            url: key,
            file_name: fileName,
          });
        } else {
          // Create a new Media row
          await mediaRepo.save(
            mediaRepo.create({
              mediable_id: id,
              mediable_type: 'station',
              url: key,
              file_name: fileName,
              entityType: 'Station',
            }),
          );
        }
      });
    }

    const fullRes = await this.getVendorStationById(id, clientId);
    return { success: true, message: 'Station updated successfully', data: fullRes.data };
  }

  async getVendorAllStation(vendorId: number, page: number | undefined, limit: number | undefined) {
    if (!page && !limit) {
      const stations = await this.repo.findSimpleStationsByVendor(vendorId);
      return { success: true, message: 'Stations fetched successfully', data: stations };
    }

    const skip = (page! - 1) * limit!;
    const { stations, count } = await this.repo.findPaginatedStationsWithChargerConnectors(vendorId, skip, limit!);

    return {
      success: true,
      message: 'Stations fetched successfully',
      data: stations,
      pagination: { totalPages: Math.ceil(count / limit!), total: count, page },
    };
  }

  async getAllStation(vendorId: number) {
    const stations = await this.repo.findStationByVendorWithChargers(vendorId);
    return { success: true, message: 'Stations fetched successfully', data: stations };
  }
}
