import { Schema, Prop, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ timestamps: true })
export class UserSettings extends Document {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, unique: true })
  userId: Types.ObjectId;

  // Notification Settings
  @Prop({ default: true })
  pushNotifications: boolean;

  @Prop({ default: true })
  rideUpdates: boolean;

  @Prop({ default: true })
  promotionsAndOffers: boolean;

  @Prop({ default: true })
  securityAlerts: boolean;

  // Communication Preferences
  @Prop({ default: true })
  emailNotifications: boolean;

  @Prop({ default: false })
  smsNotifications: boolean;

  // App Settings
  @Prop({ default: false })
  darkMode: boolean;

  @Prop({ default: 'en' })
  language: string;

  @Prop({ default: 'AED' })
  currency: string;

  @Prop({ default: 'metric' })
  distanceUnit: string; // 'metric' or 'imperial'

  // Privacy Settings
  @Prop({ default: true })
  shareLocationWithDrivers: boolean;

  @Prop({ default: false })
  shareRideHistory: boolean;

  @Prop({ default: true })
  allowAnalytics: boolean;

  // Ride Preferences
  @Prop({ default: 'standard' })
  defaultVehicleType: string;

  @Prop({ default: false })
  autoConfirmRides: boolean;

  @Prop({ default: 5 })
  defaultWaitTime: number; // minutes

  // Payment Settings
  @Prop({ default: 'card' })
  defaultPaymentMethod: string;

  @Prop({ default: false })
  autoPay: boolean;

  // Driver-specific Settings
  @Prop({ default: true })
  rideRequestAlerts: boolean;

  @Prop({ default: true })
  promotionalMessages: boolean;

  @Prop({ default: true })
  profileVisibleToCustomers: boolean;

  @Prop({ default: false })
  shareLiveLocation: boolean;

  @Prop({ default: true })
  showRatingToPublic: boolean;

  @Prop({ default: true })
  allowDataUsageAnalytics: boolean;

  @Prop({ type: Object, default: {} })
  metadata: Record<string, any>;
}

export const UserSettingsSchema = SchemaFactory.createForClass(UserSettings);
