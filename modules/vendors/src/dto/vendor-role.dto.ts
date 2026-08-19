export class CreateVendorRoleDto {
  name: string;
  permission?: number[];
}

export class UpdateVendorRoleDto {
  name?: string;
  permission?: number[];
}
