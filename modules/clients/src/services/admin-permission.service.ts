import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { AdminPermissionRepository } from '../repositories/admin-permission.repository';
import { CreatePermissionDto, UpdatePermissionDto } from '../dto/permission.dto';

@Injectable()
export class AdminPermissionService {
  constructor(private readonly adminPermissionRepository: AdminPermissionRepository) {}

  /** Mirrors `permissionController.js:createPermission`. */
  async createPermission(dto: CreatePermissionDto) {
    const permission = await this.adminPermissionRepository.create(dto);
    return { success: true, message: 'Permission created successfully ', data: permission };
  }

  /** Mirrors `permissionController.js:getPermissionById`. */
  async getPermissionById(id: number) {
    const permission = await this.adminPermissionRepository.findById(id);
    if (!permission) {
      throw new NotFoundException({ message: 'Permission not found' });
    }
    return { success: true, message: 'Permission fetched successfully', data: permission };
  }

  /** Mirrors `permissionController.js:updatePermission`. */
  async updatePermission(id: number, dto: UpdatePermissionDto) {
    const existing = await this.adminPermissionRepository.findById(id);
    if (!existing) {
      throw new NotFoundException({ message: 'Permission not found' });
    }
    const updated = await this.adminPermissionRepository.update(id, dto);
    return { success: true, message: 'Permission updated successfully', data: updated };
  }

  /** Mirrors `permissionController.js:deletePermission`. */
  async deletePermission(id: number) {
    const existing = await this.adminPermissionRepository.findById(id);
    if (!existing) {
      throw new NotFoundException({ message: 'Permission not found' });
    }
    await this.adminPermissionRepository.delete(id);
    return { success: true, message: 'Permission deleted successfully' };
  }

  async getAllPermissions(clientId?: number) {
    if (!clientId) {
      throw new BadRequestException({
        success: false,
        message: 'Client ID is required',
      });
    }

    const featureNames = [
      'Fleet Module',
      'Dynamic Tariff',
      'RFID Management',
      'Analytics Dashboard',
      'CPO AMC Management',
      'Coupons',
      'OCPI Emsp Integration',
      'Push Notification',
      'Employee Management',
      'OCPI CPO Integration',
      'Nexin Roaming Import',
      'Nexin Roaming Export',
    ];

    const requiredFeatures = await this.adminPermissionRepository.findFeaturesByNames(featureNames);

    const featureMap: Record<string, number> = {};
    requiredFeatures.forEach((f) => {
      featureMap[f.name] = f.id;
    });

    const featureIds = Object.values(featureMap);
    const mappings = await this.adminPermissionRepository.findClientFeatureMappings(clientId, featureIds);

    const enabledFeatureIds = new Set(mappings.map((m) => m.featureId));

    const featurePermissionMap: Record<string, string[]> = {
      'Fleet Module': ['Fleet_View', 'FleetOnboard', 'Fleet_Edit', 'Fleet_Manage'],
      'Dynamic Tariff': ['CPO_Manage_Tariff'],
      'RFID Management': ['RFID_View', 'User_Manage_RFID'],
      'Analytics Dashboard': ['Revenue_Analytics_View', 'Charger_Analytics_View'],
      'CPO AMC Management': ['AMC_Management'],
      'OCPI Emsp Integration': ['OCPI_EMSP_Management'],
      'Coupons': ['Coupon_View', 'Coupon_Create', 'Coupon_Edit'],
      'Push Notification': ['Notification_Management'],
      'Employee Management': ['Team_Management', 'Team_Login_History_View'],
      'OCPI CPO Integration': ['OCPI_CPO_Management'],
    };

    const excludeNames: string[] = [];

    const hasImport = featureMap['Nexin Roaming Import']
      ? enabledFeatureIds.has(featureMap['Nexin Roaming Import'])
      : false;
    const hasExport = featureMap['Nexin Roaming Export']
      ? enabledFeatureIds.has(featureMap['Nexin Roaming Export'])
      : false;

    if (!hasImport && !hasExport) {
      excludeNames.push('Nexin_Roaming_Management');
    }

    for (const [featureName, permissionsList] of Object.entries(featurePermissionMap)) {
      const featureId = featureMap[featureName];
      if (!featureId || !enabledFeatureIds.has(featureId)) {
        excludeNames.push(...permissionsList);
      }
    }

    const permissions = await this.adminPermissionRepository.findStaffPermissionsExcluding(excludeNames);

    return {
      success: true,
      message: 'Permissions fetched successfully',
      data: permissions,
    };
  }
}
