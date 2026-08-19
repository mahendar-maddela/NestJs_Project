import { Injectable, BadRequestException } from '@nestjs/common';
import { ClientRepository } from '../repositories/client.repository';

@Injectable()
export class AdminClientsService {
  constructor(private readonly clientRepository: ClientRepository) {}

  async getClientInfo(clientId: number, query: { details?: any; logo?: any; login?: any }) {
    const { details, logo, login } = query;

    let clientDetails: any = null;
    let loginConfig: any = null;
    let media: any = null;
    let features: any = null;

    if (details !== undefined) {
      clientDetails = await this.clientRepository.findClientDetailsForInfo(clientId);
    }

    if (login !== undefined) {
      loginConfig = await this.clientRepository.findCredentialConfigForInfo(clientId);

      const featuresList = await this.clientRepository.findClientFeaturesByName([
        'Fleet Module',
        'Coupons',
      ]);

      const featureMap: Record<string, number> = {};
      featuresList.forEach((f) => {
        featureMap[f.name] = f.id;
      });

      const featureIds = Object.values(featureMap);
      const mappings = await this.clientRepository.findClientFeatureMappings(clientId, featureIds);
      const enabledFeatureIds = new Set(mappings.map((m) => m.featureId));

      features = {
        fleetFeature: featureMap['Fleet Module']
          ? enabledFeatureIds.has(featureMap['Fleet Module'])
          : false,
        couponFeature: featureMap['Coupons']
          ? enabledFeatureIds.has(featureMap['Coupons'])
          : false,
      };
    }

    if (logo !== undefined) {
      const logoRecord = await this.clientRepository.findMediaLogo(clientId);
      if (!logoRecord || !logoRecord.url) {
        throw new BadRequestException({ message: 'Logo not found' });
      }

      try {
        const response = await fetch(logoRecord.url);
        const arrayBuffer = await response.arrayBuffer();
        const base64 = Buffer.from(arrayBuffer).toString('base64');
        media = {
          url: logoRecord.url,
          base64: `data:image/png;base64,${base64}`,
        };
      } catch {
        media = {
          url: logoRecord.url,
          base64: null,
        };
      }
    }

    return {
      success: true,
      message: 'Client details fetched successfully',
      data: {
        clientDetails,
        loginConfig,
        media,
        features,
      },
    };
  }
}
