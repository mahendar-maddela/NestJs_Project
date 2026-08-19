import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { AdminStationRepository } from '../repositories/admin-station.repository';
import { AwsService } from '@integrations/aws';
import { StationStatus } from 'database/src';
import { Station } from '../entities/station.entity';
import { Location } from '../entities/location.entity';
import { StationAmenity } from '../entities/station-amenity.entity';
import { Media } from '../entities/media.entity';
import { Like } from 'typeorm';
import type { QueryDeepPartialEntity } from 'typeorm/query-builder/QueryPartialEntity';

@Injectable()
export class AdminStationsService {
  constructor(
    private readonly adminStationRepository: AdminStationRepository,
    private readonly awsService: AwsService,
  ) { }

  async createStation(body: any = {}, file: any, staffId: number, clientId: number) {
    const payload = body || {};

    let locationObj = payload.location || payload.stationLocation;
    if (typeof locationObj === 'string') {
      try {
        locationObj = JSON.parse(locationObj);
      } catch {
        // Leave as string if parsing fails
      }
    }

    let parsedAmenityIds = payload.amenityIds;
    if (typeof parsedAmenityIds === 'string') {
      try {
        parsedAmenityIds = JSON.parse(parsedAmenityIds);
      } catch {
        parsedAmenityIds = parsedAmenityIds.split(',').map((item: string) => Number(item.trim())).filter(Boolean);
      }
    }

    const vendorId = payload.vendorId;
    if (!vendorId) {
      throw new BadRequestException({ message: 'Vendor ID is required' });
    }

    const vendor = await this.adminStationRepository.findVendorByIdAndClient(Number(vendorId), clientId);
    if (!vendor) {
      throw new NotFoundException({ message: 'Vendor not found' });
    }

    const vendorStationCount = await this.adminStationRepository.countVendorStations(Number(vendorId), clientId);
    if (vendor.noOfStations !== null && vendor.noOfStations !== undefined && vendorStationCount >= vendor.noOfStations) {
      throw new BadRequestException({ message: 'Maximum number of stations reached for this vendor' });
    }

    const clientStationCount = await this.adminStationRepository.countClientStations(clientId);
    const prefixConfig = await this.adminStationRepository.findPrefixConfig(clientId);

    const prefix = prefixConfig?.station?.toUpperCase() || 'ST';
    const uniqueId = `${prefix}${(clientStationCount + 1).toString().padStart(5, '0')}`;

    const parsedStatus = StationStatus.includes(payload.status) ? (payload.status as (typeof StationStatus)[number]) : 'Available';

    const newStation = await this.adminStationRepository.createStationTransaction(async (manager) => {
      const stationRepo = manager.getRepository(Station);
      const created = await stationRepo.save(
        stationRepo.create({
          name: payload.name ?? null,
          stationUniqueId: uniqueId,
          vendorId: Number(vendorId),
          stationType: payload.stationType || 'Public',
          status: parsedStatus,
          createdStaffId: staffId,
          location: typeof locationObj === 'string' ? locationObj : locationObj?.address ?? null,
          helpNumber: payload.helpNumber ?? payload.stationHelpNumber ?? null,
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

      if (parsedAmenityIds && Array.isArray(parsedAmenityIds)) {
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

      const key = await this.awsService.uploadToS3(file, folder, fileName, file.mimetype || 'image/jpeg');

      await this.adminStationRepository.createStationTransaction(async (manager) => {
        const mediaRepo = manager.getRepository(Media);
        await mediaRepo.save(mediaRepo.create({ mediable_id: newStation.id, mediable_type: 'station', url: key, file_name: fileName }));
      });
    }

    const fullRes = await this.getStationById(newStation.id, clientId);
    return {
      success: true,
      message: 'Station created successfully',
      data: fullRes.data,
    };
  }

  async getAllStations(query: any, clientId: number) {
    const page = query.page ? Number(query.page) : undefined;
    const limit = query.limit ? Number(query.limit) : undefined;
    const search = query.search || '';
    const vendorId = query.vendorId ? Number(query.vendorId) : undefined;
    const vendorType = query.vendorType ? Number(query.vendorType) : undefined;

    const base = {
      clientId,
      ...(vendorId ? { vendorId } : {}),
      ...(vendorType ? { vendor: { vendorTypeId: vendorType } } : {}),
    };

    const whereCondition = search
      ? [
        { ...base, name: Like(`%${search}%`) },
        { ...base, stationUniqueId: Like(`%${search}%`) },
      ]
      : base;

    let stations: any[] = [];
    let count = 0;

    if (limit && page) {
      const skip = (page - 1) * limit;
      const res = await this.adminStationRepository.findPaginatedStations(whereCondition, skip, limit);
      stations = res.stations;
      count = res.count;
    } else {
      const res = await this.adminStationRepository.findSimpleStations(whereCondition);
      stations = res.stations;
      count = res.count;
    }

    const dataWithMedia = await Promise.all(
      stations.map(async (st: any) => {
        const media = await this.adminStationRepository.findMediaByStation(st.id);
        const mediaWithUrls = media.map((m) => ({
          ...m,
          url: this.awsService.getCloudfrontUrl(m.url ?? ''),
        }));
        const amenities = st.stationAmenities ? st.stationAmenities.map((sa: any) => sa.amenity) : [];
        return {
          ...st,
          amenities,
          stationLocation: st.stationLocation,
          stationMedia: mediaWithUrls,
        };
      }),
    );

    if (page && limit) {
      const totalPages = Math.ceil(count / limit);
      return {
        success: true,
        message: 'Stations fetched successfully',
        data: dataWithMedia,
        pagination: {
          totalPages,
          page,
        },
      };
    }

    return {
      success: true,
      message: 'Stations fetched successfully',
      data: dataWithMedia,
    };
  }

  async getStationById(id: number, clientId: number) {
    const station = await this.adminStationRepository.findStationByIdAndClient(id, clientId);

    if (!station) {
      throw new NotFoundException({ message: 'Station not found' });
    }

    return {
      success: true,
      message: 'Station fetched successfully',
      data: station,
    };
  }

  async updateStation(id: number, body: any = {}, file: any, clientId: number) {
    const payload = body || {};
    const station = await this.adminStationRepository.findStationByIdAndClient(id, clientId);
    if (!station) {
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

    let parsedAmenityIds = payload.amenityIds;
    if (typeof parsedAmenityIds === 'string') {
      try {
        parsedAmenityIds = JSON.parse(parsedAmenityIds);
      } catch {
        parsedAmenityIds = parsedAmenityIds.split(',').map((item: string) => Number(item.trim())).filter(Boolean);
      }
    }

    await this.adminStationRepository.createStationTransaction(async (manager) => {
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
      if (payload.vendorId !== undefined) updateData.vendorId = Number(payload.vendorId);
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

      if (parsedAmenityIds && Array.isArray(parsedAmenityIds)) {
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

      await this.adminStationRepository.createStationTransaction(async (manager) => {
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

    const fullRes = await this.getStationById(id, clientId);
    return {
      success: true,
      message: 'Station updated successfully',
      data: fullRes.data,
    };
  }

  async deleteStation(id: number, clientId: number) {
    const station = await this.adminStationRepository.findStationByIdAndClient(id, clientId);
    if (!station) {
      throw new NotFoundException({ message: 'Station not found' });
    }

    const existingMedia = await this.adminStationRepository.findMediaByStation(id);
    for (const m of existingMedia) {
      await this.awsService.deleteS3File(m.url ?? '');
    }
    await this.adminStationRepository.deleteStationMedia(id);

    await this.adminStationRepository.deleteStation(id);

    return {
      success: true,
      message: 'Station deleted successfully',
    };
  }

  async updateStatus(id: number, status: string, clientId: number) {
    const station = await this.adminStationRepository.findStationByIdAndClient(id, clientId);
    if (!station) {
      throw new NotFoundException({ message: 'Station not found' });
    }

    if (!StationStatus.includes(status as (typeof StationStatus)[number])) {
      throw new BadRequestException({ message: 'Invalid station status' });
    }

    const updated = await this.adminStationRepository.updateStationStatus(id, status as (typeof StationStatus)[number]);

    return {
      success: true,
      message: 'Station status updated successfully',
      data: updated,
    };
  }
}
