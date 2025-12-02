import { IsString, IsNotEmpty, IsMongoId, IsNumber, IsOptional } from 'class-validator';

export class UpdateRideLocationDto {
  @IsMongoId()
  @IsNotEmpty()
  rideId: string;

  @IsNumber()
  @IsNotEmpty()
  latitude: number;

  @IsNumber()
  @IsNotEmpty()
  longitude: number;

  @IsString()
  @IsOptional()
  address?: string;
}

