export class CreateFleetDriverDto {
  name: string;
  phone?: string;
  email?: string;
  licenseNumber?: string;
  aadharNumber?: string;
  panNumber?: string;
  address?: string;
}

export class UpdateFleetDriverDto {
  name?: string;
  phone?: string;
  email?: string;
  licenseNumber?: string;
  aadharNumber?: string;
  panNumber?: string;
  address?: string;
  status?: string;
}
