import { Schema, Prop, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export enum FAQCategory {
  RIDES = 'Rides',
  PAYMENT = 'Payment',
  SAFETY = 'Safety',
  PRICING = 'Pricing',
  ACCOUNT = 'Account',
  GENERAL = 'General',
}

@Schema({ timestamps: true })
export class FAQ extends Document {
  @Prop({ required: true })
  question: string;

  @Prop({ required: true })
  answer: string;

  @Prop({ 
    type: String, 
    enum: Object.values(FAQCategory),
    default: FAQCategory.GENERAL 
  })
  category: FAQCategory;

  @Prop({ default: 0 })
  viewCount: number;

  @Prop({ default: true })
  isActive: boolean;

  @Prop({ default: 0 })
  helpfulCount: number;

  @Prop({ default: 0 })
  notHelpfulCount: number;
}

export const FAQSchema = SchemaFactory.createForClass(FAQ);
