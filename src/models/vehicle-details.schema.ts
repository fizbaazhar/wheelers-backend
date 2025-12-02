import { Schema, Prop, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { VehicleType } from '../common/enums/vehicle-type.enum';

@Schema({ timestamps: true })
export class VehicleDetails extends Document {
  @Prop({ required: true, type: Types.ObjectId, ref: 'User' })
  userId: Types.ObjectId;

  @Prop({ required: true, unique: true })
  licensePlateNum: string;

  @Prop({ required: true })
  modelYear: number;

  @Prop({ required: true })
  makeModel: string;

  @Prop({ 
    required: true,
    type: String,
    enum: Object.values(VehicleType)
  })
  category: VehicleType;

  // Additional vehicle information
  @Prop()
  color?: string;

  @Prop()
  engineNumber?: string;

  @Prop()
  chassisNumber?: string;

  @Prop()
  registrationDate?: Date;

  @Prop()
  insuranceExpiry?: Date;

  @Prop()
  fitnessExpiry?: Date;

  @Prop({ default: true })
  isActive: boolean;

  // Timestamps (automatically added by Mongoose when timestamps: true)
  createdAt: Date;
  updatedAt: Date;
}

export const VehicleDetailsSchema = SchemaFactory.createForClass(VehicleDetails);
