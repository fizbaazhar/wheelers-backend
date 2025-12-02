import { IsString, IsNumber, IsObject, IsOptional, ValidateNested, IsArray, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';
import { VehicleType } from '../../common/enums/vehicle-type.enum';

export class CoordinateDto {
  @IsNumber()
  latitude: number;

  @IsNumber()
  longitude: number;
}

export class LocationDto {
  @IsString()
  address: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => CoordinateDto)
  coordinate?: CoordinateDto;
}

export class CreateRideRequestDto {
  @ValidateNested()
  @Type(() => LocationDto)
  currentLocation: LocationDto;

  @ValidateNested()
  @Type(() => LocationDto)
  destination: LocationDto;

  @IsOptional()
  @IsArray()
  stops?: any[];

  @IsString()
  rideType: string;

  @IsEnum(VehicleType)
  vehicleType: VehicleType;

  @IsNumber()
  fare: number;

  @IsString()
  userId: string;

  @IsOptional()
  @IsObject()
  rideDetails?: any; 
}

export class DriverConnectionDto {
  @IsString()
  driverId: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => CoordinateDto)
  currentLocation?: CoordinateDto;

  @IsOptional()
  @IsString()
  status?: string; // 'available', 'busy', 'offline'
}
