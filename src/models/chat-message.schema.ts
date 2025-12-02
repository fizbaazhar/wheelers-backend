import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type ChatMessageDocument = ChatMessage & Document;

@Schema({ timestamps: true })
export class ChatMessage {
  @Prop({ required: true })
  messageId: string;

  @Prop({ required: true })
  threadId: string;

  @Prop({ required: true })
  senderId: string;

  @Prop({ required: true })
  senderType: string; // 'user' or 'driver'

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

  @Prop()
  replyToMessageId: string;

  @Prop({ required: true, default: false })
  isDeleted: boolean;

  @Prop()
  deletedAt: Date;

  @Prop()
  createdAt: Date;

  @Prop()
  updatedAt: Date;
}

export const ChatMessageSchema = SchemaFactory.createForClass(ChatMessage);
