import { IsString, IsNumber, IsOptional } from 'class-validator';

export class ReachedPickupDto {
  @IsString()
  rideId: string;

  @IsOptional()
  @IsString()
  message?: string;

  @IsOptional()
  @IsNumber()
  latitude?: number;

  @IsOptional()
  @IsNumber()
  longitude?: number;
}
