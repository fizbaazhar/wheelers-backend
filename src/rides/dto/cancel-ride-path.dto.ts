import { IsString, IsNotEmpty } from 'class-validator';

export class CancelRidePathDto {
  @IsString()
  @IsNotEmpty()
  reason: string;
}

