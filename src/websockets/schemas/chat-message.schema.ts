import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type ChatMessageDocument = ChatMessage & Document;

@Schema({ timestamps: true })
export class ChatMessage {
  @Prop({ required: true })
  message: string;

  @Prop({ required: true, type: String })
  rideId: string;

  @Prop({ required: true, type: String })
  senderId: string;

  @Prop({ 
    type: String, 
    enum: ['text', 'image', 'location', 'system'],
    default: 'text'
  })
  messageType: string;

  @Prop({ required: true })
  timestamp: string;

  @Prop()
  createdAt: Date;

  @Prop()
  updatedAt: Date;
}

export const ChatMessageSchema = SchemaFactory.createForClass(ChatMessage);
