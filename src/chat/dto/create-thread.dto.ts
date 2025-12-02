import { IsString, IsOptional } from 'class-validator';

export class CreateThreadDto {
  @IsString()
  rideRequestId: string;

  @IsString()
  userId: string;

  @IsString()
  driverId: string;

  @IsString()
  @IsOptional()
  initialMessage?: string;
}
