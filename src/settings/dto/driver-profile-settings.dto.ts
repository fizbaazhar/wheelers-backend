import { IsBoolean, IsOptional } from 'class-validator';

export class DriverProfileSettingsDto {
  @IsOptional()
  @IsBoolean()
  pushNotifications?: boolean;

  @IsOptional()
  @IsBoolean()
  emailNotifications?: boolean;

  @IsOptional()
  @IsBoolean()
  smsNotifications?: boolean;

  @IsOptional()
  @IsBoolean()
  rideRequestAlerts?: boolean;

  @IsOptional()
  @IsBoolean()
  promotionalMessages?: boolean;

  @IsOptional()
  @IsBoolean()
  profileVisibleToCustomers?: boolean;

  @IsOptional()
  @IsBoolean()
  shareLiveLocation?: boolean;

  @IsOptional()
  @IsBoolean()
  showRatingToPublic?: boolean;

  @IsOptional()
  @IsBoolean()
  allowDataUsageAnalytics?: boolean;

  @IsOptional()
  @IsBoolean()
  darkMode?: boolean;
}

