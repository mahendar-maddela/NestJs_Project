export class CreateDriverDto {
  fleetId: number;
  name: string;
  email?: string;
  phone?: string;
  licenseNumber?: string;
  aadharNumber?: string;
  panNumber?: string;
  address?: string;
}

export class UpdateDriverDto {
  name?: string;
  email?: string;
  phone?: string;
  status?: string;
  licenseNumber?: string;
  aadharNumber?: string;
  panNumber?: string;
  address?: string;
}
