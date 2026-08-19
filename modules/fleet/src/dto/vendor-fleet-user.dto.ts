export class CreateVendorFleetUserDto {
  name: string;
  email: string;
  phone: string;
  cName: string;
  gst?: string;
  noOfGroups?: number;
  noOfVehicle?: number;
  noOfDrivers?: number;
  remoteStart?: boolean;
}

export class UpdateVendorFleetUserDto {
  name?: string;
  email?: string;
  phone?: string;
  cName?: string;
  gst?: string;
  noOfGroups?: number;
  noOfVehicle?: number;
  noOfDrivers?: number;
  remoteStart?: boolean;
}
