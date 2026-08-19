import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { AdminVendorRepository } from '../repositories/admin-vendor.repository';
import { AwsService } from '@integrations/aws';
import { AuthRepository } from '../../../auth/src/repositories/auth.repository';
import * as bcrypt from 'bcrypt';
import { IsNull, Like } from 'typeorm';
import { generateDummyPassword } from '@app/common';

@Injectable()
export class AdminVendorService {
  constructor(
    private readonly adminVendorRepository: AdminVendorRepository,
    private readonly awsService: AwsService,
    private readonly authRepository: AuthRepository,
  ) { }

  async createVendor(body: any, staffId: number, clientId: number) {
    const { email, vendorTypeId, bankDetails, vendor_name, featureIds } = body;

    if (!email) {
      throw new BadRequestException({ message: 'Email are required.' });
    }

    const existingVendor = await this.adminVendorRepository.findVendorByEmailAndClient(email, clientId);
    if (existingVendor) {
      throw new BadRequestException({ message: 'Vendor already exists with this email' });
    }

    const dummyPassword = generateDummyPassword();
    const hashedPassword = await bcrypt.hash(dummyPassword, 10);
    const vendorCount = await this.adminVendorRepository.countVendorsByClient(clientId);
    const prefixConfig = await this.adminVendorRepository.findPrefixConfig(clientId);

    const prefix = prefixConfig?.cpo?.toUpperCase() || 'CPO';
    const uniqueId = `${prefix}${(vendorCount + 1).toString().padStart(5, '0')}`;

    const newVendor = await this.adminVendorRepository.createVendorWithDetails({
      vendorData: {
        vendor_name,
        community_name: body.community_name,
        phone: body.phone,
        email,
        vendorTypeId: vendorTypeId ? Number(vendorTypeId) : undefined,
        pan: body.pan,
        gst: body.gst,
        location: body.location,
        transFeePerc: body.transFeePerc,
        // Legacy spreads the whole request body onto the vendor row — keep the remaining
        // vendor columns pass-through as well (unknown body keys are ignored by TypeORM).
        noOfStations: body.noOfStations !== undefined ? Number(body.noOfStations) : undefined,
        noOfEmployees: body.noOfEmployees !== undefined ? Number(body.noOfEmployees) : undefined,
        noOfUsers: body.noOfUsers !== undefined ? Number(body.noOfUsers) : undefined,
        vendorUniqueId: uniqueId,
        password: hashedPassword,
        parentVendorId: null,
        isTemp: false,
        staffId,
        clientId,
        status: body.status || 'Active',
      },
      staffId,
      clientId,
      bankDetails,
      featureIds,
    });

    try {
      const clientDetails = await this.adminVendorRepository.findClientDetails(clientId);
      // Mirrors legacy `sendPasswordCredentialEmailToVendor` — client-branded template
      // (primaryColor/logoUrl/brandName/cpoUrl login link from this tenant's ClientDetails).
      await this.awsService.sendVendorCredentialsEmail(
        newVendor.vendor_name ?? vendor_name ?? '',
        email,
        dummyPassword,
        clientDetails,
      );
    } catch {
      // Ignore email dispatch errors
    }

    return {
      success: true,
      message: 'Cpo created successfully',
      data: newVendor,
    };
  }

  async getAllVendors(query: any, clientId: number) {
    const page = query.page ? Number(query.page) : undefined;
    const limit = query.limit ? Number(query.limit) : undefined;
    const search = query.search || '';
    const type = query.type;
    
    const baseWhere = {
      parentVendorId: IsNull(),
      clientId,
      ...(type ? { vendorTypeId: Number(type) } : {}),
    };

    const whereCondition: any = search
      ? [
        { ...baseWhere, vendor_name: Like(`%${search}%`) },
        { ...baseWhere, community_name: Like(`%${search}%`) },
        { ...baseWhere, phone: Like(`%${search}%`) },
        { ...baseWhere, email: Like(`%${search}%`) },
        { ...baseWhere, vendorUniqueId: Like(`%${search}%`) },
        { ...baseWhere, pan: Like(`%${search}%`) },
        { ...baseWhere, gst: Like(`%${search}%`) },
      ]
      : baseWhere;

    if (limit && page) {
      const skip = (page - 1) * limit;
      const { count, rows } = await this.adminVendorRepository.findPaginatedVendors(whereCondition, skip, limit);
      return {
        success: true,
        message: 'Vendors fetched successfully',
        data: rows,
        pagination: {
          totalPages: Math.ceil(count / limit),
          page,
          count,
        },
      };
    }

    const { count, rows } = await this.adminVendorRepository.findAllSimpleVendors(whereCondition);
    return {
      success: true,
      message: 'Vendors fetched successfully',
      data: rows,
      pagination: {
        totalPages: 1,
        page: 1,
        
      },
    };
  }

  async getVendorById(id: number, clientId: number) {
    const vendor = await this.adminVendorRepository.findVendorByIdAndClient(id, clientId);

    if (!vendor) {
      throw new NotFoundException({ message: 'Vendor not found' });
    }

    // const features = await this.adminVendorRepository.findVendorFeatures(id);

    return {
      success: true,
      message: 'Vendor fetched successfully',
      data: { ...vendor,  },
    };
  }

  async getVendorStationsById(id: number, clientId: number) {
    const vendor = await this.adminVendorRepository.findVendorStationById(id, clientId);

    if (!vendor) {
      throw new NotFoundException({ message: 'Vendor not found' });
    }

    const stationsFormatted = (vendor.stations || []).map((station: any) => {
      const counts: Record<string, number> = { Available: 0, Unavailable: 0, Faulted: 0, Engaged: 0 };

      (station.chargers || []).forEach((charger: any) => {
        (charger.connectors || []).forEach((connector: any) => {
          const st = String(connector.status);
          counts[st] = (counts[st] || 0) + 1;
        });
      });

      return {
        ...station,
        connectorStatusCounts: Object.entries(counts).map(([status, count]) => ({ status, count })),
      };
    });

    return {
      success: true,
      message: 'Vendor station fetched successfully',
      data: stationsFormatted,
    };
  }

  async getVendorChargersById(id: number) {
    const vendor = await this.adminVendorRepository.findVendorChargersById(id);
    if (!vendor) {
      throw new NotFoundException({ message: 'Vendor not found' });
    }
    return {
      success: true,
      message: 'Vendor chargers fetched successfully',
      data: vendor.chargers || [],
    };
  }

  async getVendorEmployeesById(id: number) {
    const vendor = await this.adminVendorRepository.findVendorEmployeesById(id);
    if (!vendor) {
      throw new NotFoundException({ message: 'Vendor not found' });
    }
    return {
      success: true,
      message: 'Vendor employees fetched successfully',
      data: vendor.subVendors || [],
    };
  }

  async getVendorUsersById(id: number, query: any) {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 200;
    const skip = (page - 1) * limit;

    const { count, users } = await this.adminVendorRepository.findVendorUsers(id, skip, limit);

    return {
      success: true,
      message: 'Vendor users fetched successfully',
      users,
      pagination: {
        totalPages: Math.ceil(count / limit),
        page,
      },
    };
  }

  async getVendorTariffsById(id: number) {
    const data = await this.adminVendorRepository.findVendorTariffsById(id);
    if (!data) {
      throw new NotFoundException({ message: 'Vendor not found' });
    }
    return {
      success: true,
      message: 'Vendor tariffs fetched successfully',
      data,
    };
  }

  async updateVendor(id: number, body: any, clientId: number) {
    const vendor = await this.adminVendorRepository.findVendorByIdAndClient(id, clientId);
    if (!vendor) {
      throw new NotFoundException({ success: false, message: 'Vendor not found' });
    }

    const { bankDetails, featureIds, vendor_name, community_name, phone, email, pan, gst, location, status, vendorTypeId, transFeePerc } = body;

    await this.adminVendorRepository.updateVendorWithDetails(id, {
      vendorData: {
        vendor_name,
        community_name,
        phone,
        email,
        pan,
        gst,
        location,
        status,
        vendorTypeId: vendorTypeId !== undefined ? Number(vendorTypeId) : undefined,
        transFeePerc,
        // Legacy `vendor.update(vendorData)` writes every body field — keep the remaining
        // vendor columns pass-through (unknown body keys are ignored by TypeORM).
        noOfStations: body.noOfStations !== undefined ? Number(body.noOfStations) : undefined,
        noOfEmployees: body.noOfEmployees !== undefined ? Number(body.noOfEmployees) : undefined,
        noOfUsers: body.noOfUsers !== undefined ? Number(body.noOfUsers) : undefined,
      },
      bankDetails,
      featureIds,
    });

    return {
      success: true,
      message: 'Vendor updated successfully',
    };
  }

  async deleteVendor(id: number) {
    await this.adminVendorRepository.deleteVendorRecord(id);
    return {
      success: true,
      message: 'Vendor deleted successfully',
    };
  }

  async getVendorWalletTransactions(id: number, query: any) {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 200;
    const skip = (page - 1) * limit;

    const { count, rows } = await this.adminVendorRepository.findVendorWalletTransactions(id, skip, limit);
    return {
      success: true,
      message: 'Vendor wallet transactions fetched successfully',
      data: rows,
      pagination: {
        totalPages: Math.ceil(count / limit),
        page,
      },
    };
  }

  async getAllVendorStations(id: number) {
    const data = await this.adminVendorRepository.findAllVendorStations(id);
    return {
      success: true,
      message: 'All vendor stations fetched successfully',
      data,
    };
  }

  async getAllVendorTariffs(id: number) {
    const data = await this.adminVendorRepository.findAllVendorTariffs(id);
    return {
      success: true,
      message: 'All vendor tariff fetched successfully',
      data,
    };
  }

  async getVendorWithStationsAndChargers(clientId: number) {
    const data = await this.adminVendorRepository.findVendorsWithStationsAndChargers(clientId);
    return {
      success: true,
      message: 'Vendors with Stations and Chargers fetched successfully',
      data,
    };
  }

  async countsCard(id: number, clientId: number) {
    const data = await this.adminVendorRepository.findVendorCountsCard(id, clientId);
    if (!data) {
      throw new NotFoundException({ message: 'Vendor not found' });
    }
    return {
      success: true,
      message: 'Vendor counts fetched successfully',
      data,
    };
  }

  async updateVendorStatus(id: number, clientId: number, status: string) {
    const vendor = await this.adminVendorRepository.findLeanByIdAndClient(id, clientId);
    if (!vendor) {
      throw new NotFoundException({ message: 'Vendor not found' });
    }
    await this.adminVendorRepository.updateStatus(id, status);
    return {
      success: true,
      message: 'Vendor status updated successfully',
      data: { ...vendor, status },
    };
  }

  /** Mirrors `controllers/auth/vendorAuthController.js:updateVendorPassword`, reused at the admin-mounted `PATCH /vendor/:id` route. */
  async updateVendorPassword(token: string, password: string) {
    if (!password) {
      throw new BadRequestException({ message: 'Email and password are required' });
    }

    const forgotPasswordToken = await this.authRepository.findForgotPasswordToken(token, 'vendor');
    if (!forgotPasswordToken) {
      throw new NotFoundException({ message: 'Invalid token' });
    }

    const vendor = await this.adminVendorRepository.findById(forgotPasswordToken.userId);
    if (!vendor) {
      throw new NotFoundException({ message: 'Vendor not found' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    await this.adminVendorRepository.updatePassword(vendor.id, hashedPassword);
    await this.authRepository.deleteForgotPasswordToken(forgotPasswordToken.id);

    return { success: true, message: 'Vendor password updated successfully' };
  }
}
