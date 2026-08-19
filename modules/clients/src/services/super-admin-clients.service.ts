import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { IsNull, Like, Not } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { ClientRepository } from '../repositories/client.repository';
import { CreateClientDto } from '../dto/create-client.dto';
import { UpdateClientDto } from '../dto/update-client.dto';
import { ClientQueryDto } from '../dto/client-query.dto';
import { AwsService } from '@integrations/aws';
import { generateDummyPassword } from '@app/common';

@Injectable()
export class SuperAdminClientsService {
  constructor(
    private readonly clientRepository: ClientRepository,
    private readonly awsService: AwsService,
  ) { }

  /** Mirrors legacy `mediaHandler.js:removeSpaceFuntion` — uppercases and space-normalizes a file name. */
  private static normalizeFileName(name: string): string {
    return (name || 'UNKNOWN').replace(/\s+/g, '_').toUpperCase();
  }

  /** Mirrors legacy `mediaHandler.js:saveMedia` + `updateMedia` — uploads each provided client
   *  document to S3 and upserts its Media row (`mediable_id = clientId`, `entityType = 'Client'`). */
  private async saveClientDocuments(clientId: number, files: Record<string, any>): Promise<void> {
    const documents = [
      { key: 'agreement', type: 'agreement' },
      { key: 'nda', type: 'nda' },
      { key: 'kyc_documents', type: 'kyc_documents' },
      { key: 'gst_certificate', type: 'gst_certificate' },
      { key: 'cancelled_cheque', type: 'cancelled_cheque' },
      { key: 'business_license', type: 'business_license' },
      { key: 'pushNotification', type: 'pushNotification' },
      { key: 'logo', type: 'logo' },
    ];

    for (const doc of documents) {
      const file = files?.[doc.key];
      if (!file) continue;

      const folder = `uploads/${doc.type}`;
      const rawName = file.filename || file.originalname || file.name || 'file';
      const fileName = `${Date.now()}-${SuperAdminClientsService.normalizeFileName(rawName)}`;

      const key = await this.awsService.uploadToS3(file, folder, fileName, file.mimetype || 'application/octet-stream');
      const url = `${folder}/${fileName}`;

      const existing = await this.clientRepository.findClientMediaByType(clientId, doc.type);
      if (existing) {
        // legacy `updateMedia` deletes the previous object from S3 before uploading the replacement
        if (existing.url) {
          await this.awsService.deleteS3File(existing.url).catch(() => undefined);
        }
        await this.clientRepository.updateClientMedia(clientId, doc.type, url, fileName);
      } else {
        await this.clientRepository.saveClientMedia(clientId, doc.type, url, fileName);
      }
    }
  }

  async createClient(body: CreateClientDto, files: Record<string, any> = {}) {
    const {
      first_name,
      last_name,
      email,
      clientContactEmail,
      phone,
      isTemp,
      status,
      paymentConfig,
      credentialConfig,
      prefixConfig,
      clientDetails,
      assignedEmployee,
      amcDetails,
      generalAddress = {},
    } = body;

    // 1. Party ID uniqueness check
    if (clientDetails.partyId) {
      const existingPartyId = await this.clientRepository.findPartyId(clientDetails.partyId);
      if (existingPartyId) {
        throw new BadRequestException({ success: false, message: 'Party ID already exists' });
      }
    }

    // 2. Company Name uniqueness check
    if (clientDetails.companyName) {
      const existingCompany = await this.clientRepository.findCompanyName(clientDetails.companyName);
      if (existingCompany) {
        throw new BadRequestException({ success: false, message: 'Company name already exists' });
      }
    }

    // 3. Email uniqueness check
    const existingStaff = await this.clientRepository.findStaffByEmail(email);
    if (existingStaff) {
      throw new BadRequestException({ success: false, message: 'Email already exists' });
    }

    if (files?.pushNotification) {
      const pushFileName = (files.pushNotification.filename || files.pushNotification.originalname || '').toLowerCase();
      if (pushFileName && !pushFileName.endsWith('.json')) {
        throw new BadRequestException({ success: false, message: 'Only .json files are allowed for push notification' });
      }
    }

    const dummyPassword = generateDummyPassword();
    const hashedPassword = await bcrypt.hash(dummyPassword, 10);
    const clientToken = uuidv4();

    const result = await this.clientRepository.runTransaction(async (tx) => {
      const newClient = await this.clientRepository.createClientRecord(tx, {
        first_name,
        last_name,
        email,
        phone,
        password: hashedPassword,
        isTemp: isTemp === true || (isTemp as any) === 'true',
        status: status || 'Active',
        clientToken,
        assignedEmployee: assignedEmployee ? Number(assignedEmployee) : undefined,
        clientContactEmail,
      });

      const empId = `${prefixConfig?.employee?.toUpperCase() || 'EMP'}${String(newClient.id).padStart(5, '0')}`;

      await this.clientRepository.updateStaffRecord(tx, newClient.id, {
        clientId: newClient.id,
        empId,
      });

      await this.clientRepository.createAdminRoleForClient(tx, newClient.id, newClient.id);

      if (body.features && body.features.length > 0) {
        await this.clientRepository.attachClientFeatures(tx, newClient.id, body.features);
      }

      if (generalAddress.address) {
        await this.clientRepository.createAddress(tx, {
          address: generalAddress.address,
          city: generalAddress.city,
          state: generalAddress.state,
          country: generalAddress.country,
          pincode: generalAddress.pincode,
          clientId: newClient.id,
        });
      }

      await this.clientRepository.createClientDetails(tx, {
        clientId: newClient.id,
        companyName: clientDetails.companyName || first_name,
        contactEmail: clientDetails.contactEmail || email,
        contactPhone: clientDetails.contactPhone || phone,
        gst: clientDetails.gst,
        address: clientDetails.address,
        businessUrl: clientDetails.businessUrl,
        logoUrl: clientDetails.logoUrl,
        primaryColor: clientDetails.primaryColor,
        fleetUrl: clientDetails.fleetUrl,
        csmsUrl: clientDetails.csmsUrl,
        cpoUrl: clientDetails.cpoUrl,
        brandName: clientDetails.brandName,
        clientType: clientDetails.clientType,
        userPortalUrl: clientDetails.userPortalUrl,
        state: clientDetails.state,
        country: clientDetails.country,
        zipCode: clientDetails.zipCode,
        termsAndConditionsUrl: clientDetails.termsAndConditionsUrl,
        privacyPolicyUrl: clientDetails.privacyPolicyUrl,
        refundPolicyUrl: clientDetails.refundPolicyUrl,
        supportUrl: clientDetails.supportUrl,
        shippingPolicyUrl: clientDetails.shippingPolicyUrl,
        mobileAppDeepLinkUrl: clientDetails.mobileAppDeepLinkUrl,
        partyId: clientDetails.partyId ? clientDetails.partyId.toUpperCase() : undefined,
        preConvDeductionAmount: clientDetails.preConvDeductionAmount ? Number(clientDetails.preConvDeductionAmount) : 0,
      });

      if (paymentConfig.provider) {
        await this.clientRepository.createPaymentConfig(tx, {
          clientId: newClient.id,
          provider: paymentConfig.provider,
          keyId: paymentConfig.keyId,
          secretToken: paymentConfig.secretToken,
        });
      }

      if (credentialConfig.email) {
        await this.clientRepository.createCredentialConfig(tx, {
          clientId: newClient.id,
          email: credentialConfig.email,
          emailHost: credentialConfig.emailHost,
          mailPassKey: credentialConfig.mailPassKey,
          userLoginType: credentialConfig.userLoginType,
          authKey: credentialConfig.authKey,
          template: credentialConfig.template,
        });
      }

      await this.clientRepository.createPrefixConfig(tx, {
        clientId: newClient.id,
        session: prefixConfig.session?.toUpperCase(),
        coupon: prefixConfig.coupon?.toUpperCase(),
        wallet: prefixConfig.wallet?.toUpperCase(),
        cpo: prefixConfig.cpo?.toUpperCase(),
        station: prefixConfig.station?.toUpperCase(),
        employee: prefixConfig.employee?.toUpperCase(),
        fleet: prefixConfig.fleet?.toUpperCase(),
        user: prefixConfig.user?.toUpperCase(),
        driver: prefixConfig.driver?.toUpperCase(),
        vehicleGroup: prefixConfig.vehicleGroup?.toUpperCase(),
      });

      if (amcDetails && amcDetails.startDate && amcDetails.endDate) {
        await this.clientRepository.createClientAmc(tx, {
          clientId: newClient.id,
          startDate: new Date(amcDetails.startDate),
          endDate: new Date(amcDetails.endDate),
          standard_amc_hours: amcDetails.standard_amc_hours ? Number(amcDetails.standard_amc_hours) : undefined,
          total_amc_hours: amcDetails.standard_amc_hours ? Number(amcDetails.standard_amc_hours) : undefined,
          charger_amc_count: amcDetails.charger_amc_count ? Number(amcDetails.charger_amc_count) : undefined,
          remaining_amc_hours: amcDetails.standard_amc_hours ? Number(amcDetails.standard_amc_hours) : undefined,
          chargers_for_increment: amcDetails.chargers_for_increment ? Number(amcDetails.chargers_for_increment) : undefined,
          increment_hours: amcDetails.increment_hours ? Number(amcDetails.increment_hours) : undefined,
          status: 'Active',
          amc_amount: amcDetails.amc_amount ? Number(amcDetails.amc_amount) : undefined,
          amc_incremental_amount: amcDetails.amc_incremental_amount ? Number(amcDetails.amc_incremental_amount) : undefined,
        });
      }

      return newClient;
    });

    try {
      // Mirrors legacy `sendEmailToClientOnboarding` — Nexin CSMS onboarding template.
      await this.awsService.sendClientOnboardingEmail(
        email,
        dummyPassword,
        clientDetails.companyName || first_name,
        clientDetails.csmsUrl || '',
      );
    } catch {
      // Ignore email errors during client onboarding
    }

    await this.saveClientDocuments(result.id, files);

    return {
      success: true,
      message: 'Client created successfully',
      clientId: result.id,
    };
  }

  async updateClient(id: number, body: UpdateClientDto, files: Record<string, any> = {}) {
    const {
      first_name,
      last_name,
      email,
      phone,
      isTemp,
      status,
      assignedEmployee,
      paymentConfig,
      credentialConfig,
      prefixConfig,
      clientDetails,
      amcDetails,
      generalAddress,
      clientContactEmail,
    } = body;

    const client = await this.clientRepository.findById(id);

    if (!client) {
      throw new NotFoundException({ success: false, message: 'Client not found' });
    }

    if (email && email !== client.email) {
      const existingEmail = await this.clientRepository.findStaffByEmail(email, id);
      if (existingEmail) {
        throw new BadRequestException({ success: false, message: 'Email already exists' });
      }
    }

    if (clientDetails && clientDetails.partyId) {
      const existingPartyId = await this.clientRepository.findPartyId(clientDetails.partyId, id);
      if (existingPartyId) {
        throw new BadRequestException({ success: false, message: 'Party ID already exists' });
      }
    }

    if (files?.pushNotification) {
      const pushFileName = (files.pushNotification.filename || files.pushNotification.originalname || '').toLowerCase();
      if (pushFileName && !pushFileName.endsWith('.json')) {
        throw new BadRequestException({ success: false, message: 'Only .json files are allowed for push notification' });
      }
    }

    await this.clientRepository.runTransaction(async (tx) => {
      // 1) General Details: update only if properties are passed
      const staffUpdate: any = {};
      if (first_name !== undefined) staffUpdate.first_name = first_name;
      if (last_name !== undefined) staffUpdate.last_name = last_name;
      if (email !== undefined) staffUpdate.email = email;
      if (phone !== undefined) staffUpdate.phone = phone;
      if (isTemp !== undefined) staffUpdate.isTemp = isTemp === true || (isTemp as any) === 'true';
      if (status !== undefined) staffUpdate.status = status;
      if (assignedEmployee !== undefined) staffUpdate.assignedEmployee = assignedEmployee ? Number(assignedEmployee) : null;
      if (clientContactEmail !== undefined) staffUpdate.clientContactEmail = clientContactEmail;

      if (Object.keys(staffUpdate).length > 0) {
        await this.clientRepository.updateStaffRecord(tx, id, staffUpdate);
      }

      // 2) Registered Address
      if (generalAddress) {
        const addressData: any = {};
        if (generalAddress.address !== undefined) addressData.address = generalAddress.address;
        if (generalAddress.city !== undefined) addressData.city = generalAddress.city;
        if (generalAddress.state !== undefined) addressData.state = generalAddress.state;
        if (generalAddress.country !== undefined) addressData.country = generalAddress.country;
        if (generalAddress.pincode !== undefined) addressData.pincode = generalAddress.pincode;

        if (Object.keys(addressData).length > 0) {
          await this.clientRepository.upsertAddress(tx, id, addressData);
        }
      }

      // 3) Business Details (ClientDetails)
      if (clientDetails) {
        const detailsData: any = {};
        if (clientDetails.companyName !== undefined) detailsData.companyName = clientDetails.companyName;
        if (clientDetails.contactEmail !== undefined) detailsData.contactEmail = clientDetails.contactEmail;
        if (clientDetails.contactPhone !== undefined) detailsData.contactPhone = clientDetails.contactPhone;
        if (clientDetails.gst !== undefined) detailsData.gst = clientDetails.gst;
        if (clientDetails.address !== undefined) detailsData.address = clientDetails.address;
        if (clientDetails.businessUrl !== undefined) detailsData.businessUrl = clientDetails.businessUrl;
        if (clientDetails.logoUrl !== undefined) detailsData.logoUrl = clientDetails.logoUrl;
        if (clientDetails.primaryColor !== undefined) detailsData.primaryColor = clientDetails.primaryColor;
        if (clientDetails.fleetUrl !== undefined) detailsData.fleetUrl = clientDetails.fleetUrl;
        if (clientDetails.csmsUrl !== undefined) detailsData.csmsUrl = clientDetails.csmsUrl;
        if (clientDetails.cpoUrl !== undefined) detailsData.cpoUrl = clientDetails.cpoUrl;
        if (clientDetails.brandName !== undefined) detailsData.brandName = clientDetails.brandName;
        if (clientDetails.clientType !== undefined) detailsData.clientType = clientDetails.clientType;
        if (clientDetails.state !== undefined) detailsData.state = clientDetails.state;
        if (clientDetails.country !== undefined) detailsData.country = clientDetails.country;
        if (clientDetails.zipCode !== undefined) detailsData.zipCode = clientDetails.zipCode;
        if (clientDetails.userPortalUrl !== undefined) detailsData.userPortalUrl = clientDetails.userPortalUrl;
        if (clientDetails.termsAndConditionsUrl !== undefined) detailsData.termsAndConditionsUrl = clientDetails.termsAndConditionsUrl;
        if (clientDetails.privacyPolicyUrl !== undefined) detailsData.privacyPolicyUrl = clientDetails.privacyPolicyUrl;
        if (clientDetails.refundPolicyUrl !== undefined) detailsData.refundPolicyUrl = clientDetails.refundPolicyUrl;
        if (clientDetails.shippingPolicyUrl !== undefined) detailsData.shippingPolicyUrl = clientDetails.shippingPolicyUrl;
        if (clientDetails.supportUrl !== undefined) detailsData.supportUrl = clientDetails.supportUrl;
        if (clientDetails.mobileAppDeepLinkUrl !== undefined) detailsData.mobileAppDeepLinkUrl = clientDetails.mobileAppDeepLinkUrl;
        if (clientDetails.partyId !== undefined) detailsData.partyId = clientDetails.partyId ? clientDetails.partyId.toUpperCase() : null;
        if (clientDetails.preConvDeductionAmount !== undefined) {
          detailsData.preConvDeductionAmount = clientDetails.preConvDeductionAmount ? Number(clientDetails.preConvDeductionAmount) : 0;
        }

        if (Object.keys(detailsData).length > 0) {
          const existingDetails = await this.clientRepository.findClientDetailsByClientId(tx, id);
          if (existingDetails) {
            await this.clientRepository.updateClientDetails(tx, existingDetails.id, detailsData);
          } else {
            await this.clientRepository.createClientDetails(tx, { clientId: id, ...detailsData });
          }
        }
      }

      // 4) Payment Config
      if (paymentConfig) {
        const paymentData: any = {};
        if (paymentConfig.provider !== undefined) paymentData.provider = paymentConfig.provider;
        if (paymentConfig.keyId !== undefined) paymentData.keyId = paymentConfig.keyId;
        if (paymentConfig.secretToken !== undefined) paymentData.secretToken = paymentConfig.secretToken;

        if (Object.keys(paymentData).length > 0) {
          const existPaymentConfig = await this.clientRepository.findPaymentConfig(tx, id);
          if (existPaymentConfig) {
            await this.clientRepository.updatePaymentConfig(tx, existPaymentConfig.id, paymentData);
          } else {
            await this.clientRepository.createPaymentConfig(tx, { clientId: id, ...paymentData });
          }
        }
      }

      // 5) Credential Config
      if (credentialConfig) {
        const credentialData: any = {};
        if (credentialConfig.email !== undefined) credentialData.email = credentialConfig.email;
        if (credentialConfig.emailHost !== undefined) credentialData.emailHost = credentialConfig.emailHost;
        if (credentialConfig.mailPassKey !== undefined) credentialData.mailPassKey = credentialConfig.mailPassKey;
        if (credentialConfig.userLoginType !== undefined) credentialData.userLoginType = credentialConfig.userLoginType;
        if (credentialConfig.authKey !== undefined) credentialData.authKey = credentialConfig.authKey;
        if (credentialConfig.template !== undefined) credentialData.template = credentialConfig.template;

        if (Object.keys(credentialData).length > 0) {
          const existCredentialConfig = await this.clientRepository.findCredentialConfigByClientId(tx, id);
          if (existCredentialConfig) {
            await this.clientRepository.updateCredentialConfig(tx, existCredentialConfig.id, credentialData);
          } else {
            await this.clientRepository.createCredentialConfig(tx, { clientId: id, ...credentialData });
          }
        }
      }

      // 6) Prefix Config
      if (prefixConfig) {
        const prefixData: any = {};
        if (prefixConfig.session !== undefined) prefixData.session = prefixConfig.session?.toUpperCase();
        if (prefixConfig.coupon !== undefined) prefixData.coupon = prefixConfig.coupon?.toUpperCase();
        if (prefixConfig.wallet !== undefined) prefixData.wallet = prefixConfig.wallet?.toUpperCase();
        if (prefixConfig.cpo !== undefined) prefixData.cpo = prefixConfig.cpo?.toUpperCase();
        if (prefixConfig.station !== undefined) prefixData.station = prefixConfig.station?.toUpperCase();
        if (prefixConfig.employee !== undefined) prefixData.employee = prefixConfig.employee?.toUpperCase();
        if (prefixConfig.fleet !== undefined) prefixData.fleet = prefixConfig.fleet?.toUpperCase();
        if (prefixConfig.user !== undefined) prefixData.user = prefixConfig.user?.toUpperCase();
        if (prefixConfig.driver !== undefined) prefixData.driver = prefixConfig.driver?.toUpperCase();
        if (prefixConfig.vehicleGroup !== undefined) prefixData.vehicleGroup = prefixConfig.vehicleGroup?.toUpperCase();

        if (Object.keys(prefixData).length > 0) {
          await this.clientRepository.updatePrefixConfig(tx, id, prefixData);
        }
      }

      // 8) Features
      if (body.features) {
        await this.clientRepository.replaceClientFeatures(tx, id, body.features);
      }

      // 9) AMC Details
      if (amcDetails) {
        const amcData: any = {};
        if (amcDetails.startDate !== undefined) amcData.startDate = new Date(amcDetails.startDate);
        if (amcDetails.endDate !== undefined) amcData.endDate = new Date(amcDetails.endDate);
        if (amcDetails.standard_amc_hours !== undefined) {
          amcData.standard_amc_hours = amcDetails.standard_amc_hours ? Number(amcDetails.standard_amc_hours) : null;
          amcData.total_amc_hours = amcDetails.standard_amc_hours ? Number(amcDetails.standard_amc_hours) : null;
          amcData.remaining_amc_hours = amcDetails.standard_amc_hours ? Number(amcDetails.standard_amc_hours) : null;
        }
        if (amcDetails.charger_amc_count !== undefined) {
          amcData.charger_amc_count = amcDetails.charger_amc_count ? Number(amcDetails.charger_amc_count) : null;
        }
        if (amcDetails.chargers_for_increment !== undefined) {
          amcData.chargers_for_increment = amcDetails.chargers_for_increment ? Number(amcDetails.chargers_for_increment) : null;
        }
        if (amcDetails.increment_hours !== undefined) {
          amcData.increment_hours = amcDetails.increment_hours ? Number(amcDetails.increment_hours) : null;
        }
        if (amcDetails.amc_amount !== undefined) {
          amcData.amc_amount = amcDetails.amc_amount ? Number(amcDetails.amc_amount) : null;
        }
        if (amcDetails.amc_incremental_amount !== undefined) {
          amcData.amc_incremental_amount = amcDetails.amc_incremental_amount ? Number(amcDetails.amc_incremental_amount) : null;
        }

        if (Object.keys(amcData).length > 0) {
          const existingAmc = await this.clientRepository.findLatestClientAmc(tx, id);
          if (existingAmc) {
            await this.clientRepository.updateClientAmc(tx, existingAmc.id, amcData);
          } else {
            await this.clientRepository.createClientAmc(tx, { clientId: id, status: 'Active', ...amcData });
          }
        }
      }
    });

    await this.saveClientDocuments(id, files);

    return {
      success: true,
      message: 'Client updated successfully',
    };
  }

  async getAllClients(query: ClientQueryDto) {
    const { search, page, limit } = query;

    const pageNum = page
      ? Math.max(Number(page) || 1, 1)
      : undefined;

    const limitNum = limit
      ? Math.max(Number(limit) || 10, 1)
      : undefined;

    const where = search ? [
      {
        clientToken: Not(IsNull()),
        first_name: Like(`%${search}%`),
      },
      {
        clientToken: Not(IsNull()),
        last_name: Like(`%${search}%`),
      },
    ]
      : {
        clientToken: Not(IsNull()),
      };

    if (!pageNum || !limitNum) {
      const clients = await this.clientRepository.findAllSimple(where);

      return {
        success: true,
        message: 'Clients fetched successfully',
        data: clients,
      };
    }

    const skip = (pageNum - 1) * limitNum;

    const [count, clients] = await Promise.all([
      this.clientRepository.countClients(where),
      this.clientRepository.findPaginated(
        where,
        skip,
        limitNum,
      ),
    ]);

    return {
      success: true,
      message: 'Clients fetched successfully',
      data: clients,
      pagination: {
        total: count,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(count / limitNum),
      },
    };
  }

  async getClientById(id: number) {
    const client = await this.clientRepository.findClientFullDetails(id);

    if (!client) {
      throw new NotFoundException({ message: 'Client not found' });
    }

    return {
      success: true,
      message: 'Client fetched successfully',
      data: client,
    };
  }

  async getClientFeatures() {
    const features = await this.clientRepository.findAllClientFeatures();
    return {
      success: true,
      data: features,
      message: 'Fetched Successfully',
    };
  }

  async testEmailTemplate(body: any) {
    const credentialConfig = body?.credentialConfig;
    if (credentialConfig?.email && credentialConfig?.mailPassKey && credentialConfig?.emailHost) {
      try {
        const nodemailer = require('nodemailer');
        const transporter = nodemailer.createTransport({
          host: credentialConfig.emailHost,
          port: 587,
          secure: false,
          auth: {
            user: credentialConfig.email,
            pass: credentialConfig.mailPassKey,
          },
        });
        await transporter.verify();
      } catch (err: any) {
        throw new BadRequestException({ success: false, message: err.message || 'Failed to verify email configuration' });
      }
    }
    return {
      success: true,
      message: 'Email sent successfully',
    };
  }
}
