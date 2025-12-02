import { IsString, IsNotEmpty, IsMongoId } from 'class-validator';

export class CancelRideDto {
  @IsMongoId()
  @IsNotEmpty()
  rideId: string;

  @IsString()
  @IsNotEmpty()
  reason: string;
}

