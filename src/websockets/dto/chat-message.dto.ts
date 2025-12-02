import { IsString, IsNotEmpty, IsOptional, IsMongoId } from 'class-validator';

export class ChatMessageDto {
  @IsString()
  @IsNotEmpty()
  message: string;

  @IsMongoId()
  @IsNotEmpty()
  rideId: string;

  @IsMongoId()
  @IsNotEmpty()
  senderId: string;

  @IsOptional()
  @IsString()
  messageType?: 'text' | 'image' | 'location' | 'system';

  @IsOptional()
  @IsString()
  timestamp?: string;
}

export class JoinRideDto {
  @IsMongoId()
  @IsNotEmpty()
  rideId: string;

  @IsMongoId()
  @IsNotEmpty()
  userId: string;
}

export class LeaveRideDto {
  @IsMongoId()
  @IsNotEmpty()
  rideId: string;

  @IsMongoId()
  @IsNotEmpty()
  userId: string;
}
