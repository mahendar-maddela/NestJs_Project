export class CreateFleetUserDto {
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

export class UpdateFleetUserDto {
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

export class FleetBlockUnblockDto {
  status: string;
}
