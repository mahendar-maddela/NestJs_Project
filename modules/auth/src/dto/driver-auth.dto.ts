export class DriverLoginDto {
  contact: string;
  fleetId: string;
}

export class DriverResendOtpDto {
  driverId: number;
}

export class DriverVerifyOtpDto {
  otp: string;
}

export class DriverUpdateProfileDto {
  name?: string;
  email?: string;
  address?: string;
}
