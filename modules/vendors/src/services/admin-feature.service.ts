import { Injectable, NotFoundException } from '@nestjs/common';
import { AdminFeatureRepository } from '../repositories/admin-feature.repository';
import { CreateFeatureDto, UpdateFeatureDto } from '../dto/admin-feature.dto';

const GATE_FEATURE_NAMES = ['Fleet Module', 'Dynamic Tariff', 'RFID Management', 'Analytics Dashboard', 'CPO AMC Management'];
const GATE_TO_EXCLUDE: Record<string, string> = {
  'Fleet Module': 'Fleet',
  'Dynamic Tariff': 'Tariff Management',
  'RFID Management': 'RFID',
  'Analytics Dashboard': 'Analytics',
  'CPO AMC Management': 'AMC',
};

/** Mirrors `controllers/admin/featureController.js`. Vendor-permission catalogue, gated by the client's enabled ClientFeatures. */
@Injectable()
export class AdminFeatureService {
  constructor(private readonly repo: AdminFeatureRepository) {}

  async createFeature(dto: CreateFeatureDto) {
    const feature = await this.repo.create(dto);
    return { success: true, message: 'Feature created successfully', data: feature };
  }

  async getAllFeatures(clientId: number) {
    const gateFeatures = await this.repo.findFeaturesByNames(GATE_FEATURE_NAMES);
    const featureMap: Record<string, number> = {};
    gateFeatures.forEach((f) => (featureMap[f.name] = f.id));

    const enabledFeatureIds = await this.repo.findEnabledFeatureIds(clientId, Object.values(featureMap));

    const excludeNames: string[] = [];
    for (const [gateName, excludeName] of Object.entries(GATE_TO_EXCLUDE)) {
      if (!enabledFeatureIds.includes(featureMap[gateName])) {
        excludeNames.push(excludeName);
      }
    }

    const features = await this.repo.findAllExcluding(excludeNames);
    return { success: true, message: 'Features fetched successfully', data: features };
  }

  async getFeatureById(id: number) {
    const feature = await this.repo.findById(id);
    if (!feature) throw new NotFoundException({ message: 'Feature not found' });
    return { success: true, message: 'Feature fetched successfully', data: feature };
  }

  async updateFeature(id: number, dto: UpdateFeatureDto) {
    const existing = await this.repo.findById(id);
    if (!existing) throw new NotFoundException({ message: 'Feature not found' });
    const updated = await this.repo.update(id, dto);
    return { success: true, message: 'Feature updated successfully', data: updated };
  }

  async deleteFeature(id: number) {
    const existing = await this.repo.findById(id);
    if (!existing) throw new NotFoundException({ message: 'Feature not found' });
    await this.repo.delete(id);
    return { success: true, message: 'Feature deleted successfully' };
  }
}
