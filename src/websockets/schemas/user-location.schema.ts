import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type UserLocationDocument = UserLocation & Document;

@Schema({ timestamps: true })
export class UserLocation {
  @Prop({ required: true, type: String })
  userId: string;

  @Prop({ required: true, type: String })
  rideId: string;

  @Prop({ required: true })
  latitude: number;

  @Prop({ required: true })
  longitude: number;

  @Prop()
  accuracy: number;

  @Prop()
  speed: number;

  @Prop({ required: true })
  timestamp: string;

  @Prop()
  createdAt: Date;

  @Prop()
  updatedAt: Date;
}

export const UserLocationSchema = SchemaFactory.createForClass(UserLocation);
