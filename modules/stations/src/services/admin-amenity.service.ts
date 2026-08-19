import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { AdminAmenityRepository } from '../repositories/admin-amenity.repository';
import { AwsService } from '@integrations/aws';
import { AmenityStatus } from 'database/src';
import { Amenity } from '../entities/amenity.entity';
import { VendorTypeAmenity } from '../../../vendors/src/entities/vendor-type-amenity.entity';

@Injectable()
export class AdminAmenityService {
  constructor(
    private readonly adminAmenityRepository: AdminAmenityRepository,
    private readonly awsService: AwsService,
  ) {}

  async createAmenity(body: any, file: any) {
    const { name, status } = body;
    let imageKey: string | null = null;

    if (file) {
      const cleanName = (file.originalname || 'amenity').replace(/\s+/g, '_');
      const fileName = `${Date.now()}-${cleanName}`;
      const folder = 'uploads/amenity';
      const fileBuffer = file.buffer || file;

      imageKey = await this.awsService.uploadToS3(fileBuffer, folder, fileName, file.mimetype || 'image/jpeg');
    }

    const parsedStatus = status && AmenityStatus.includes(status) ? (status as (typeof AmenityStatus)[number]) : 'Active';

    const amenity = await this.adminAmenityRepository.createAmenity({
      name: name || '',
      image: imageKey,
      status: parsedStatus,
    });

    return {
      success: true,
      message: 'Amenity created successfully',
      data: {
        ...amenity,
        image: amenity.image ? this.awsService.getCloudfrontUrl(amenity.image) : null,
      },
    };
  }

  async getAllAmenities(query: any) {
    const { status } = query;
    const where: any = {};
    if (status && AmenityStatus.includes(status)) {
      where.status = status as (typeof AmenityStatus)[number];
    }

    const amenities = await this.adminAmenityRepository.findAllAmenities(where);

    const formatted = amenities.map((a) => ({
      ...a,
      image: a.image ? this.awsService.getCloudfrontUrl(a.image) : null,
    }));

    return {
      success: true,
      message: 'Amenities fetched successfully',
      data: formatted,
    };
  }

  async getAmenityById(id: number) {
    const amenity = await this.adminAmenityRepository.findAmenityById(id);
    if (!amenity) {
      throw new NotFoundException({ message: 'Amenity not found' });
    }

    return {
      success: true,
      message: 'Amenity fetched successfully',
      data: {
        ...amenity,
        image: amenity.image ? this.awsService.getCloudfrontUrl(amenity.image) : null,
      },
    };
  }

  async updateAmenity(id: number, body: any, file: any) {
    const amenity = await this.adminAmenityRepository.findAmenityById(id);
    if (!amenity) {
      throw new NotFoundException({ message: 'Amenity not found' });
    }

    let imageKey = amenity.image;

    if (file) {
      if (amenity.image) {
        await this.awsService.deleteS3File(amenity.image);
      }

      const cleanName = (file.originalname || 'amenity').replace(/\s+/g, '_');
      const fileName = `${Date.now()}-${cleanName}`;
      const folder = 'uploads/amenity';
      const fileBuffer = file.buffer || file;

      imageKey = await this.awsService.uploadToS3(fileBuffer, folder, fileName, file.mimetype || 'image/jpeg');
    }

    const { name, status, vendorTypeIds } = body;
    const parsedStatus = status && AmenityStatus.includes(status) ? (status as (typeof AmenityStatus)[number]) : undefined;

    const updated = await this.adminAmenityRepository.createAmenityTransaction(async (manager) => {
      const amenityRepo = manager.getRepository(Amenity);
      await amenityRepo.update(
        { id },
        {
          ...(name ? { name } : {}),
          ...(imageKey ? { image: imageKey } : {}),
          ...(parsedStatus ? { status: parsedStatus } : {}),
        },
      );
      const updatedAmenity = await amenityRepo.findOneOrFail({ where: { id } });

      if (vendorTypeIds && Array.isArray(vendorTypeIds)) {
        const vendorTypeAmenityRepo = manager.getRepository(VendorTypeAmenity);
        await vendorTypeAmenityRepo.delete({ amenityId: id });
        if (vendorTypeIds.length > 0) {
          await vendorTypeAmenityRepo.save(
            vendorTypeIds.map((vTypeId: number) => vendorTypeAmenityRepo.create({ amenityId: id, vendorTypeId: Number(vTypeId) })),
          );
        }
      }

      return updatedAmenity;
    });

    return {
      success: true,
      message: 'Amenity updated successfully',
      data: {
        ...updated,
        image: updated.image ? this.awsService.getCloudfrontUrl(updated.image) : null,
      },
    };
  }

  async deleteAmenity(id: number) {
    const amenity = await this.adminAmenityRepository.findAmenityById(id);
    if (!amenity) {
      throw new NotFoundException({ message: 'Amenity not found' });
    }

    if (amenity.image) {
      await this.awsService.deleteS3File(amenity.image);
    }

    await this.adminAmenityRepository.deleteVendorTypeAmenities(id);
    await this.adminAmenityRepository.deleteStationAmenities(id);
    await this.adminAmenityRepository.deleteAmenity(id);

    return {
      success: true,
      message: 'Amenity deleted successfully',
    };
  }
}
