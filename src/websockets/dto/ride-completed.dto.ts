import { IsString, IsNumber, IsOptional } from 'class-validator';

export class RideCompletedDto {
  @IsString()
  rideId: string;

  @IsOptional()
  @IsString()
  message?: string;

  @IsOptional()
  @IsNumber()
  finalFare?: number;

  @IsOptional()
  @IsNumber()
  distance?: number;

  @IsOptional()
  @IsNumber()
  duration?: number;

  @IsOptional()
  @IsNumber()
  finalLatitude?: number;

  @IsOptional()
  @IsNumber()
  finalLongitude?: number;

  @IsOptional()
  @IsString()
  finalAddress?: string;
}
