import { IsString, IsNotEmpty, IsOptional, IsEnum } from 'class-validator';

export enum DocumentType {
  DRIVER_LICENSE = 'driver_license',
  VEHICLE_REGISTRATION = 'vehicle_registration',
  INSURANCE_CARD = 'insurance_card',
  ID_CARD = 'id_card',
  PROOF_OF_ADDRESS = 'proof_of_address',
  OTHER = 'other',
}

export class GenerateUploadUrlDto {
  @IsString()
  @IsNotEmpty()
  fileName: string;

  @IsString()
  @IsNotEmpty()
  fileType: string;

  @IsEnum(DocumentType)
  documentType: DocumentType;
}

export class GenerateMultipleUploadUrlsDto {
  @IsString()
  @IsNotEmpty()
  userId: string;

  files: Array<{
    fileName: string;
    fileType: string;
    documentType: DocumentType;
  }>;
}
