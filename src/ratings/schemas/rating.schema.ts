import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type RatingDocument = Rating & Document;

@Schema({ timestamps: true })
export class Rating {
  @Prop({ required: true, type: String })
  rideId: string;

  @Prop({ required: true, type: String })
  ratedById: string;

  @Prop({ required: true, type: String })
  ratedToId: string;

  @Prop({ 
    required: true, 
    type: Number, 
    min: 1, 
    max: 5 
  })
  rating: number;

  @Prop({ type: String })
  comment?: string;

  @Prop({ 
    type: String, 
    enum: ['driver', 'rider'],
    required: true 
  })
  ratingType: string;

  @Prop({ default: false })
  isDeleted: boolean;

  @Prop()
  deletedAt?: Date;

  @Prop()
  createdAt: Date;

  @Prop()
  updatedAt: Date;
}

export const RatingSchema = SchemaFactory.createForClass(Rating);

RatingSchema.index({ ratedToId: 1, ratingType: 1 });
RatingSchema.index({ rideId: 1, ratedById: 1 });
RatingSchema.index({ ratedToId: 1, createdAt: -1 });

