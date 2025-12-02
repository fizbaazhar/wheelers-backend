import { Schema, Prop, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export enum FeedbackType {
  APP_RATING = 'app_rating',
  RIDE_FEEDBACK = 'ride_feedback',
  GENERAL_FEEDBACK = 'general_feedback',
  BUG_REPORT = 'bug_report',
  FEATURE_REQUEST = 'feature_request',
}

export enum FeedbackStatus {
  PENDING = 'pending',
  REVIEWED = 'reviewed',
  IN_PROGRESS = 'in_progress',
  RESOLVED = 'resolved',
  CLOSED = 'closed',
}

@Schema({ timestamps: true })
export class Feedback extends Document {
  @Prop({ required: true })
  userId: string;

  @Prop({ 
    type: String, 
    enum: Object.values(FeedbackType),
    default: FeedbackType.GENERAL_FEEDBACK 
  })
  type: FeedbackType;

  @Prop({ required: true })
  message: string;

  @Prop({ min: 1, max: 5 })
  rating?: number;

  @Prop({ 
    type: String, 
    enum: Object.values(FeedbackStatus),
    default: FeedbackStatus.PENDING 
  })
  status: FeedbackStatus;

  @Prop()
  subject?: string;

  @Prop({ type: Types.ObjectId, ref: 'Ride' })
  rideId?: Types.ObjectId;

  @Prop()
  reviewedBy?: string;

  @Prop()
  adminResponse?: string;

  @Prop()
  reviewedAt?: Date;

  @Prop({ type: Object, default: {} })
  metadata: Record<string, any>;

  @Prop({ type: [String], default: [] })
  tags: string[];

  // Timestamps (automatically added by Mongoose when timestamps: true)
  createdAt: Date;
  updatedAt: Date;
}

export const FeedbackSchema = SchemaFactory.createForClass(Feedback);
