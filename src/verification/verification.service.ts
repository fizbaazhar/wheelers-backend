import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { 
  VerificationDocumentSchema, 
  VerificationDocument, 
  DocumentType, 
  DocumentStatus 
} from '../models/verification-document.schema';
import { CreateVerificationDocumentDto } from './dto/create-verification-document.dto';

@Injectable()
export class VerificationService {
  private readonly logger = new Logger(VerificationService.name);
  private readonly s3Client: S3Client;
  private readonly bucketName: string;

  constructor(
    private configService: ConfigService,
    @InjectModel(VerificationDocumentSchema.name) 
    private verificationDocumentModel: Model<VerificationDocument>
  ) {
    this.bucketName = this.configService.get<string>('AWS_S3_BUCKET_NAME') || 'wheels-verification';
    
    this.s3Client = new S3Client({
      region: this.configService.get<string>('AWS_REGION') || 'aws-region',
      credentials: {
        accessKeyId: this.configService.get<string>('AWS_ACCESS_KEY_ID') || '',
        secretAccessKey: this.configService.get<string>('AWS_SECRET_ACCESS_KEY') || '',
      },
    });
  }

  async generateUploadUrl(
    fileName: string,
    fileType: string,
    userId: string,
    documentType: string
  ): Promise<{ uploadUrl: string; fileKey: string }> {
    try {
      const timestamp = Date.now();
      const fileExtension = fileName.split('.').pop();
      const fileKey = `verification/${userId}/${documentType}/${timestamp}_${fileName}`;

      const command = new PutObjectCommand({
        Bucket: this.bucketName,
        Key: fileKey,
        ContentType: fileType,
        Metadata: {
          userId,
          documentType,
          originalFileName: fileName,
        },
      });

      const uploadUrl = await getSignedUrl(this.s3Client, command, {
        expiresIn: 900,
      });

      this.logger.log(`Generated upload URL for user ${userId}, document type: ${documentType}`);

      return {
        uploadUrl,
        fileKey,
      };
    } catch (error) {
      this.logger.error('Error generating upload URL:', error);
      throw new Error('Failed to generate upload URL');
    }
  }

  async generateMultipleUploadUrls(
    files: Array<{ fileName: string; fileType: string; documentType: string }>,
    userId: string
  ): Promise<Array<{ uploadUrl: string; fileKey: string; documentType: string; fileName: string }>> {
    try {
      const uploadUrls = await Promise.all(
        files.map(async (file) => {
          const result = await this.generateUploadUrl(
            file.fileName,
            file.fileType,
            userId,
            file.documentType
          );
          return {
            ...result,
            documentType: file.documentType,
            fileName: file.fileName,
          };
        })
      );

      this.logger.log(`Generated ${uploadUrls.length} upload URLs for user ${userId}`);
      return uploadUrls;
    } catch (error) {
      this.logger.error('Error generating multiple upload URLs:', error);
      throw new Error('Failed to generate upload URLs');
    }
  }

  async saveVerificationDocument(
    createDto: CreateVerificationDocumentDto,
    userId: string
  ): Promise<VerificationDocument> {
    try {
      const document = new this.verificationDocumentModel({
        ...createDto,
        userId,
        status: DocumentStatus.PENDING,
        uploadedAt: new Date(),
      });

      const savedDocument = await document.save();
      this.logger.log(`Saved verification document for user ${userId}, type: ${createDto.documentType}`);
      
      return savedDocument;
    } catch (error) {
      this.logger.error('Error saving verification document:', error);
      throw new Error('Failed to save verification document');
    }
  }

  async getUserVerificationDocuments(userId: string): Promise<VerificationDocument[]> {
    try {
      const documents = await this.verificationDocumentModel
        .find({ userId })
        .sort({ uploadedAt: -1 })
        .exec();

      this.logger.log(`Retrieved ${documents.length} verification documents for user ${userId}`);
      return documents;
    } catch (error) {
      this.logger.error('Error retrieving user verification documents:', error);
      throw new Error('Failed to retrieve verification documents');
    }
  }

  async getVerificationDocumentsByStatus(status: DocumentStatus): Promise<VerificationDocument[]> {
    try {
      const documents = await this.verificationDocumentModel
        .find({ status })
        .sort({ uploadedAt: -1 })
        .exec();

      this.logger.log(`Retrieved ${documents.length} verification documents with status: ${status}`);
      return documents;
    } catch (error) {
      this.logger.error('Error retrieving verification documents by status:', error);
      throw new Error('Failed to retrieve verification documents');
    }
  }

  async updateDocumentStatus(
    documentId: string,
    status: DocumentStatus,
    reviewedBy?: string,
    rejectionReason?: string
  ): Promise<VerificationDocument> {
    try {
      const updateData: any = {
        status,
        reviewedAt: new Date(),
      };

      if (reviewedBy) {
        updateData.reviewedBy = reviewedBy;
      }

      if (rejectionReason) {
        updateData.rejectionReason = rejectionReason;
      }

      const document = await this.verificationDocumentModel
        .findByIdAndUpdate(documentId, updateData, { new: true })
        .exec();

      if (!document) {
        throw new Error('Document not found');
      }

      this.logger.log(`Updated document ${documentId} status to ${status}`);
      return document;
    } catch (error) {
      this.logger.error('Error updating document status:', error);
      throw new Error('Failed to update document status');
    }
  }

  async getVerificationDocumentById(documentId: string): Promise<VerificationDocument> {
    try {
      const document = await this.verificationDocumentModel.findById(documentId).exec();
      
      if (!document) {
        throw new Error('Document not found');
      }

      return document;
    } catch (error) {
      this.logger.error('Error retrieving verification document:', error);
      throw new Error('Failed to retrieve verification document');
    }
  }

  async deleteVerificationDocument(documentId: string, userId: string): Promise<boolean> {
    try {
      const result = await this.verificationDocumentModel
        .findOneAndDelete({ _id: documentId, userId })
        .exec();

      if (!result) {
        throw new Error('Document not found or access denied');
      }

      this.logger.log(`Deleted verification document ${documentId} for user ${userId}`);
      return true;
    } catch (error) {
      this.logger.error('Error deleting verification document:', error);
      throw new Error('Failed to delete verification document');
    }
  }
}
