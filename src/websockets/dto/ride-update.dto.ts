import { IsString, IsNotEmpty, IsOptional, IsMongoId, IsEnum, IsNumber } from 'class-validator';

export enum RideStatus {
  PENDING = 'pending',
  ACCEPTED = 'accepted',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled'
}

export class RideUpdateDto {
  @IsMongoId()
  @IsNotEmpty()
  rideId: string;

  @IsEnum(RideStatus)
  @IsNotEmpty()
  status: RideStatus;

  @IsOptional()
  @IsMongoId()
  driverId?: string;

  @IsOptional()
  @IsMongoId()
  passengerId?: string;

  @IsOptional()
  @IsNumber()
  estimatedArrival?: number;

  @IsOptional()
  @IsString()
  location?: string;

  @IsOptional()
  @IsString()
  message?: string;
}

export class LocationUpdateDto {
  @IsMongoId()
  @IsNotEmpty()
  rideId: string;

  @IsMongoId()
  @IsNotEmpty()
  userId: string;

  @IsNumber()
  @IsNotEmpty()
  latitude: number;

  @IsNumber()
  @IsNotEmpty()
  longitude: number;

  @IsOptional()
  @IsNumber()
  accuracy?: number;

  @IsOptional()
  @IsNumber()
  speed?: number;
}
