import { Schema, Prop, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export enum TicketStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  RESOLVED = 'resolved',
  CLOSED = 'closed',
}

export enum TicketPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  URGENT = 'urgent',
}

export enum TicketCategory {
  PAYMENT = 'payment',
  RIDE_ISSUE = 'ride_issue',
  TECHNICAL = 'technical',
  ACCOUNT = 'account',
  SAFETY = 'safety',
  GENERAL = 'general',
}

@Schema({ timestamps: true })
export class SupportTicket extends Document {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId: Types.ObjectId;

  @Prop({ required: true })
  subject: string;

  @Prop({ required: true })
  description: string;

  @Prop({ 
    type: String, 
    enum: Object.values(TicketStatus),
    default: TicketStatus.PENDING 
  })
  status: TicketStatus;

  @Prop({ 
    type: String, 
    enum: Object.values(TicketPriority),
    default: TicketPriority.MEDIUM 
  })
  priority: TicketPriority;

  @Prop({ 
    type: String, 
    enum: Object.values(TicketCategory),
    default: TicketCategory.GENERAL 
  })
  category: TicketCategory;

  @Prop({ unique: true })
  ticketNumber: string;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  assignedTo?: Types.ObjectId;

  @Prop()
  resolution?: string;

  @Prop()
  resolvedAt?: Date;

  @Prop({ type: [{ 
    message: String, 
    senderId: { type: Types.ObjectId, ref: 'User' },
    isFromUser: { type: Boolean, default: true },
    createdAt: { type: Date, default: Date.now }
  }], default: [] })
  messages: Array<{
    message: string;
    senderId: Types.ObjectId;
    isFromUser: boolean;
    createdAt: Date;
  }>;

  @Prop({ type: Object, default: {} })
  metadata: Record<string, any>;
}

export const SupportTicketSchema = SchemaFactory.createForClass(SupportTicket);
