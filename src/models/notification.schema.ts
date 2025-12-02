import { Schema, Prop, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export enum NotificationType {
  RIDE_UPDATE = 'ride_update',
  SECURITY_ALERT = 'security_alert',
  PROMOTION = 'promotion',
  APP_UPDATE = 'app_update',
  PAYMENT = 'payment',
  GENERAL = 'general',
}

export enum NotificationPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  URGENT = 'urgent',
}

@Schema({ timestamps: true })
export class Notification extends Document {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId: Types.ObjectId;

  @Prop({ required: true })
  title: string;

  @Prop({ required: true })
  message: string;

  @Prop({ 
    type: String, 
    enum: Object.values(NotificationType),
    default: NotificationType.GENERAL 
  })
  type: NotificationType;

  @Prop({ 
    type: String, 
    enum: Object.values(NotificationPriority),
    default: NotificationPriority.MEDIUM 
  })
  priority: NotificationPriority;

  @Prop({ default: false })
  isRead: boolean;

  @Prop({ default: false })
  isPushSent: boolean;

  @Prop({ default: false })
  isEmailSent: boolean;

  @Prop({ default: false })
  isSMSSent: boolean;

  @Prop({ type: Object, default: {} })
  metadata: Record<string, any>;

  @Prop()
  actionUrl?: string;

  @Prop()
  actionText?: string;

  @Prop()
  imageUrl?: string;
}

export const NotificationSchema = SchemaFactory.createForClass(Notification);
