import { Schema, Prop, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export enum VerificationStatus {
  UNVERIFIED = 'unverified',
  PENDING = 'pending',
  VERIFIED = 'verified',
  REJECTED = 'rejected',
}

export enum UserStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  SUSPENDED = 'suspended',
  BANNED = 'banned',
}

export enum UserType {
  USER = 'user',
  DRIVER = 'driver',
}

export enum UserRole {
  ADMIN = 'admin',
  USER = 'user',
  DRIVER = 'driver',
}

@Schema({ timestamps: true })
export class User extends Document {
  @Prop({ required: true, unique: true })
  phoneNumber: string;

  // Profile Information
  @Prop()
  fullName?: string;

  @Prop()
  email?: string;

  @Prop()
  password?: string;

  @Prop()
  profilePicture?: string;

  @Prop()
  dateOfBirth?: Date;

  @Prop()
  gender?: string;

  @Prop()
  cnic?: string;

  // Location Information
  @Prop()
  city?: string;

  @Prop()
  country?: string;

  @Prop()
  address?: string;

  // Verification
  @Prop({ 
    type: String, 
    enum: Object.values(VerificationStatus),
    default: VerificationStatus.UNVERIFIED 
  })
  verificationStatus: VerificationStatus;

  @Prop()
  nadraVerified: boolean;

  @Prop()
  emailVerified: boolean;

  @Prop()
  phoneVerified: boolean;

  // User Type
  @Prop({ 
    type: String, 
    enum: Object.values(UserType),
    default: UserType.USER 
  })
  userType: UserType;

  @Prop({ 
    type: String, 
    enum: Object.values(UserRole),
    default: UserRole.USER 
  })
  role: UserRole;

  // User Status
  @Prop({ 
    type: String, 
    enum: Object.values(UserStatus),
    default: UserStatus.ACTIVE 
  })
  status: UserStatus;

  // Rating and Stats
  @Prop({ default: 0 })
  rating: number;

  @Prop({ default: 0 })
  totalRides: number;

  @Prop({ default: 0 })
  totalSpent: number;

  @Prop()
  memberSince?: Date;

  @Prop()
  lastActiveAt?: Date;

  // Emergency Contact
  @Prop()
  emergencyContactName?: string;

  @Prop()
  emergencyContactPhone?: string;

  // Preferences
  @Prop({ default: 'en' })
  preferredLanguage: string;

  @Prop({ default: 'AED' })
  preferredCurrency: string;

  // Metadata
  @Prop({ type: Object, default: {} })
  metadata: Record<string, any>;

  // Timestamps (automatically added by Mongoose when timestamps: true)
  createdAt: Date;
  updatedAt: Date;
}

export const UserSchema = SchemaFactory.createForClass(User);