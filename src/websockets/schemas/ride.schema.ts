import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { VehicleType } from '../../common/enums/vehicle-type.enum';

const CoordinateSchema = {
  latitude: { type: Number, required: true },
  longitude: { type: Number, required: true }
};

const LocationSchema = {
  address: { type: String, required: true },
  coordinate: {
    type: {
      latitude: Number,
      longitude: Number
    },
    _id: false
  }
};

export type RideDocument = Ride & Document;

@Schema({ timestamps: true })
export class Ride {
  @Prop({ required: true, type: String })
  driverId: string;

  @Prop({ required: true, type: String })
  passengerId: string;

  @Prop({ 
    type: String, 
    enum: ['pending', 'accepted', 'in_progress', 'completed', 'cancelled'],
    default: 'pending'
  })
  status: string;

  @Prop({
    type: String,
    enum: VehicleType,
    required: true
  })
  vehicleType: VehicleType;

  @Prop({
    type: {
      address: String,
      coordinate: {
        latitude: Number,
        longitude: Number
      }
    },
    _id: false
  })
  pickupLocation: {
    address: string;
    coordinate?: {
      latitude: number;
      longitude: number;
    };
  };

  @Prop({
    type: {
      address: String,
      coordinate: {
        latitude: Number,
        longitude: Number
      }
    },
    _id: false
  })
  destinationLocation: {
    address: string;
    coordinate?: {
      latitude: number;
      longitude: number;
    };
  };

  @Prop({
    type: [{
      address: String,
      coordinate: {
        latitude: Number,
        longitude: Number
      }
    }],
    default: [],
    _id: false
  })
  stops: Array<{
    address: string;
    coordinate?: {
      latitude: number;
      longitude: number;
    };
  }>;

  @Prop({
    type: {
      address: String,
      coordinate: {
        latitude: Number,
        longitude: Number
      },
      timestamp: Date
    },
    _id: false
  })
  currentLocation: {
    address?: string;
    coordinate?: {
      latitude: number;
      longitude: number;
    };
    timestamp?: Date;
  };

  @Prop()
  estimatedFare: number;

  @Prop()
  actualFare: number;

  @Prop()
  distance: number;

  @Prop()
  duration: number;

  @Prop()
  cancelReason: string;

  @Prop()
  cancelledBy: string; 

  @Prop()
  cancelledById: string; 

  @Prop()
  cancelledAt: Date;

  @Prop({
    type: Object,
    required: false,
    _id: false
  })
  rideDetails?: {
    vehicleType?: string; 
    weight?: number;
    dimensions?: string;
    packageDescription?: string;
    decorationType?: string; 
    specialInstructions?: string;
    eventDate?: string;
    eventTime?: string;
    patientCondition?: string;
    medicalHistory?: string;
    specialRequirements?: string;
    numberOfPatients?: number;
    emergencyType?: string;
    vehicleMake?: string;
    vehicleModel?: string;
    vehicleColor?: string;
    description?: string;
  };

  @Prop()
  createdAt: Date;

  @Prop()
  updatedAt: Date;
}

export const RideSchema = SchemaFactory.createForClass(Ride);
