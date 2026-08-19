import { SetMetadata } from '@nestjs/common';

export const STAFF_PERMISSION_KEY = 'staff_permission';
export const StaffPermission = (permission: string) => SetMetadata(STAFF_PERMISSION_KEY, permission);
