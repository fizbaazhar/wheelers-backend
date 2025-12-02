import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type VerificationDocument = VerificationDocumentSchema & Document;

export enum DocumentStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  UNDER_REVIEW = 'under_review',
}

export enum DocumentType {
  DRIVER_LICENSE = 'driver_license',
  VEHICLE_REGISTRATION = 'vehicle_registration',
  INSURANCE_CARD = 'insurance_card',
  ID_CARD = 'id_card',
  PROOF_OF_ADDRESS = 'proof_of_address',
  OTHER = 'other',
}

@Schema({ timestamps: true, collection: 'verificationDocuments' })
export class VerificationDocumentSchema {
  @Prop({ required: true })
  userId: string;

  @Prop({ required: true })
  fileName: string;

  @Prop({ required: true })
  fileType: string;

  @Prop({ required: true })
  fileKey: string;

  @Prop({ required: true, enum: DocumentType })
  documentType: DocumentType;

  @Prop({ required: true, enum: DocumentStatus, default: DocumentStatus.PENDING })
  status: DocumentStatus;

  @Prop()
  s3Url?: string;

  @Prop()
  fileSize?: number;

  @Prop()
  uploadedAt?: Date;

  @Prop()
  reviewedAt?: Date;

  @Prop()
  reviewedBy?: string;

  @Prop()
  rejectionReason?: string;

  @Prop({ type: Object })
  metadata?: Record<string, any>;

  @Prop()
  expiresAt?: Date;
}

export const VerificationDocumentSchemaFactory = SchemaFactory.createForClass(VerificationDocumentSchema);

VerificationDocumentSchemaFactory.index({ userId: 1, documentType: 1 });
VerificationDocumentSchemaFactory.index({ status: 1 });
VerificationDocumentSchemaFactory.index({ uploadedAt: -1 });
