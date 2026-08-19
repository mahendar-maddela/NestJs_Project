export class SuperAdminRevenueFilterQueryDto {
  stationId?: string;
  chargerId?: string;
  vendorId?: string;
  clientId?: string;
}

export class SuperAdminMonthlyRevenueQueryDto extends SuperAdminRevenueFilterQueryDto {
  month?: string;
  year?: string;
}

export class SuperAdminYearlyRevenueQueryDto extends SuperAdminRevenueFilterQueryDto {
  year?: string;
}

export class SuperAdminEachMonthAnalyticsQueryDto extends SuperAdminRevenueFilterQueryDto {
  year?: string;
  fleetId?: string;
}

export class SuperAdminDownloadReportsQueryDto {
  clientIds?: string;
  vendorIds?: string;
  stationIds?: string;
  chargerIds?: string;
  startDate?: string;
  endDate?: string;
  applyGst?: string;
}
