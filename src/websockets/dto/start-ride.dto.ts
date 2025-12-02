import { IsString, IsOptional } from 'class-validator';

export class StartRideDto {
  @IsString()
  rideId: string;

  @IsOptional()
  @IsString()
  message?: string;
}
