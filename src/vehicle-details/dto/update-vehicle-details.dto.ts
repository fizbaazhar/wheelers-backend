import { IsString, IsNumber, IsEnum, IsOptional, IsDateString, Min, Max } from 'class-validator';
import { VehicleType } from '../../common/enums/vehicle-type.enum';

export class UpdateVehicleDetailsDto {
  @IsOptional()
  @IsString()
  licensePlateNum?: string;

  @IsOptional()
  @IsNumber()
  @Min(1900)
  @Max(new Date().getFullYear() + 1)
  modelYear?: number;

  @IsOptional()
  @IsString()
  makeModel?: string;

  @IsOptional()
  @IsEnum(VehicleType)
  category?: VehicleType;

  @IsOptional()
  @IsString()
  color?: string;

  @IsOptional()
  @IsString()
  engineNumber?: string;

  @IsOptional()
  @IsString()
  chassisNumber?: string;

  @IsOptional()
  @IsDateString()
  registrationDate?: string;

  @IsOptional()
  @IsDateString()
  insuranceExpiry?: string;

  @IsOptional()
  @IsDateString()
  fitnessExpiry?: string;
}

