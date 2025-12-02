import { IsString, IsNotEmpty, IsOptional, IsMongoId, IsEnum } from 'class-validator';

export enum NotificationType {
  RIDE_REQUEST = 'ride_request',
  RIDE_ACCEPTED = 'ride_accepted',
  RIDE_CANCELLED = 'ride_cancelled',
  RIDE_COMPLETED = 'ride_completed',
  DRIVER_ARRIVED = 'driver_arrived',
  MESSAGE_RECEIVED = 'message_received',
  PAYMENT_RECEIVED = 'payment_received',
  RATING_RECEIVED = 'rating_received',
  BID_ACCEPTED = 'bid_accepted',
  RIDE_CONFIRMED = 'ride_confirmed',
  DRIVER_REACHED_PICKUP = 'driver_reached_pickup',
  RIDE_STARTED = 'ride_started'
}

export class NotificationDto {
  @IsMongoId()
  @IsNotEmpty()
  recipientId: string;

  @IsEnum(NotificationType)
  @IsNotEmpty()
  type: NotificationType;

  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsNotEmpty()
  message: string;

  @IsOptional()
  @IsMongoId()
  rideId?: string;

  @IsOptional()
  @IsMongoId()
  senderId?: string;

  @IsOptional()
  data?: any;
}
