import { Schema, Prop, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export enum PlaceType {
  HOME = 'home',
  WORK = 'work',
  FAVORITE = 'favorite',
  OTHER = 'other',
}

@Schema({ timestamps: true })
export class SavedPlace extends Document {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId: Types.ObjectId;

  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  address: string;

  @Prop({ 
    type: String, 
    enum: Object.values(PlaceType),
    default: PlaceType.OTHER 
  })
  type: PlaceType;

  @Prop({ required: true })
  latitude: number;

  @Prop({ required: true })
  longitude: number;

  @Prop()
  city?: string;

  @Prop()
  country?: string;

  @Prop()
  postalCode?: string;

  @Prop({ default: 0 })
  useCount: number;

  @Prop()
  lastUsedAt?: Date;

  @Prop({ default: true })
  isActive: boolean;

  @Prop({ type: Object, default: {} })
  metadata: Record<string, any>;
}

export const SavedPlaceSchema = SchemaFactory.createForClass(SavedPlace);
