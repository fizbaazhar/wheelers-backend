import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type ChatThreadDocument = ChatThread & Document;

@Schema({ timestamps: true })
export class ChatThread {
  @Prop({ required: true })
  threadId: string;

  @Prop({ required: true })
  rideRequestId: string;

  @Prop({ required: true })
  userId: string;

  @Prop({ required: true })
  driverId: string;

  @Prop({ required: true, default: 'active' })
  status: string; // 'active', 'closed', 'archived'

  @Prop({ required: true, default: false })
  isActive: boolean;

  @Prop()
  lastMessageAt: Date;

  @Prop()
  lastMessage: string;

  @Prop()
  lastMessageSenderId: string;

  @Prop({ default: 0 })
  unreadCountUser: number;

  @Prop({ default: 0 })
  unreadCountDriver: number;

  @Prop()
  createdAt: Date;

  @Prop()
  updatedAt: Date;
}

export const ChatThreadSchema = SchemaFactory.createForClass(ChatThread);
