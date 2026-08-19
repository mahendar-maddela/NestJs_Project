export class CreateVendorEmployeeDto {
  email: string;
  vendor_name?: string;
  phone?: string;
  roleId?: number;
  [key: string]: unknown;
}

export class UpdateVendorEmployeeDto {
  roleId?: number;
  [key: string]: unknown;
}

export class AssignIndividualPermissionsDto {
  vendorId?: number;
  permissionIds: number[];
}
