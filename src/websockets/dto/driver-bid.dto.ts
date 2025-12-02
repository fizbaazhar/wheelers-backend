import { IsString, IsNumber, IsOptional, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class DriverBidDto {
  @IsString()
  rideRequestId: string;

  @IsString()
  @IsOptional()
  driverId?: string;

  @IsString()
  @IsOptional()
  driverName?: string;

  @IsString()
  @IsOptional()
  driverPhone?: string;

  @IsNumber()
  bidAmount: number;

  @IsString()
  @IsOptional()
  message?: string;

  @IsNumber()
  estimatedArrivalTime: number; // in minutes

  @IsString()
  @IsOptional()
  vehicleType?: string;

  @IsString()
  @IsOptional()
  vehicleNumber?: string;
}
