import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type RideMessageDocument = RideMessage & Document;

@Schema({ timestamps: true })
export class RideMessage {
  @Prop({ required: true })
  messageId: string;

  @Prop({ required: true })
  rideId: string;

  @Prop({ required: true })
  senderId: string;

  @Prop({ required: true })
  message: string;

  @Prop({ required: true, default: 'text' })
  messageType: string; // 'text', 'image', 'file', 'system'

  @Prop()
  fileUrl: string;

  @Prop()
  fileName: string;

  @Prop({ required: true, default: false })
  isRead: boolean;

  @Prop()
  readAt: Date;

  @Prop({ required: true, default: false })
  isEdited: boolean;

  @Prop()
  editedAt: Date;

  @Prop({ required: true, default: false })
  isDeleted: boolean;

  @Prop()
  deletedAt: Date;

  @Prop()
  createdAt: Date;

  @Prop()
  updatedAt: Date;
}

export const RideMessageSchema = SchemaFactory.createForClass(RideMessage);
