import { IsString, IsNumber, IsOptional, ValidateNested, IsArray, IsObject, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';
import { LocationDto } from './ride-request.dto';
import { VehicleType } from '../../common/enums/vehicle-type.enum';

export class AcceptBidDto {
  @IsString()
  rideRequestId: string;

  @IsString()
  driverId: string;

  @IsNumber()
  acceptedBidAmount: number;

  @IsString()
  @IsOptional()
  message?: string;

  @IsString()
  @IsOptional()
  rideType?: string;

  @IsEnum(VehicleType)
  vehicleType: VehicleType;

  @IsOptional()
  @IsObject()
  rideDetails?: any;

  @IsOptional()
  @ValidateNested()
  @Type(() => LocationDto)
  pickupLocation?: LocationDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => LocationDto)
  destinationLocation?: LocationDto;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => LocationDto)
  stops?: LocationDto[];
}
