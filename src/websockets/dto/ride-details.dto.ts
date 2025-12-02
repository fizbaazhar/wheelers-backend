import { IsString, IsNumber, IsOptional, IsEnum, IsObject, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export enum FreightVehicleType {
  BIKE = 'Bike',
  CAR = 'Car',
  TRUCK = 'Truck'
}

export class FreightRideDetails {
  @IsEnum(FreightVehicleType)
  vehicleType: FreightVehicleType;

  @IsNumber()
  weight: number; 

  @IsString()
  dimensions: string; 

  @IsOptional()
  @IsString()
  packageDescription?: string;
}

export enum DecorationType {
  STANDARD = 'Standard',
  PREMIUM = 'Premium',
  LUXURY = 'Luxury'
}

export class ShadiCarRideDetails {
  @IsEnum(DecorationType)
  decorationType: DecorationType;

  @IsOptional()
  @IsString()
  specialInstructions?: string;

  @IsOptional()
  @IsString()
  eventDate?: string;

  @IsOptional()
  @IsString()
  eventTime?: string;
}

export class AmbulanceRideDetails {
  @IsString()
  patientCondition: string; 

  @IsOptional()
  @IsString()
  medicalHistory?: string;

  @IsOptional()
  @IsString()
  specialRequirements?: string; 

  @IsOptional()
  @IsNumber()
  numberOfPatients?: number;
}

export class EmergencyHelpRideDetails {
  @IsString()
  emergencyType: string; 

  @IsOptional()
  @IsString()
  vehicleMake?: string;

  @IsOptional()
  @IsString()
  vehicleModel?: string;

  @IsOptional()
  @IsString()
  vehicleColor?: string;

  @IsOptional()
  @IsString()
  description?: string; 
}

export type RideDetails = FreightRideDetails | ShadiCarRideDetails | AmbulanceRideDetails | EmergencyHelpRideDetails;

