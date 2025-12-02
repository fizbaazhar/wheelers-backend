import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class SendRideMessageDto {
  @IsString()
  @IsNotEmpty()
  rideId: string;

  @IsString()
  @IsNotEmpty()
  message: string;

  @IsString()
  @IsOptional()
  messageType?: string;
}
