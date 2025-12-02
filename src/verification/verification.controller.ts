import { 
  Controller, 
  Post, 
  Get,
  Put,
  Delete,
  Body, 
  Param,
  Query,
  UseGuards, 
  Request,
  Logger,
  HttpStatus,
  HttpException
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { VerificationService } from './verification.service';
import { 
  GenerateUploadUrlDto, 
  GenerateMultipleUploadUrlsDto,
  DocumentType 
} from './dto/generate-upload-url.dto';
import { CreateVerificationDocumentDto, UpdateVerificationDocumentDto } from './dto/create-verification-document.dto';
import { DocumentStatus } from '../models/verification-document.schema';

@Controller('verification')
@UseGuards(JwtAuthGuard)
export class VerificationController {
  private readonly logger = new Logger(VerificationController.name);

  constructor(private readonly verificationService: VerificationService) {}

  @Post('upload-url')
  async generateUploadUrl(
    @Body() generateUploadUrlDto: GenerateUploadUrlDto,
    @Request() req
  ) {
    try {
      const userId = req.user.userId;
      const { fileName, fileType, documentType } = generateUploadUrlDto;

      this.logger.log(`Generating upload URL for user ${userId}, file: ${fileName}`);

      const result = await this.verificationService.generateUploadUrl(
        fileName,
        fileType,
        userId,
        documentType
      );

      return {
        success: true,
        data: {
          uploadUrl: result.uploadUrl,
          fileKey: result.fileKey,
          documentType,
          fileName,
          expiresIn: 900,
        },
        message: 'Upload URL generated successfully',
      };
    } catch (error) {
      this.logger.error('Error generating upload URL:', error);
      throw new HttpException(
        'Failed to generate upload URL',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Post('upload-urls/batch')
  async generateMultipleUploadUrls(
    @Body() generateMultipleUploadUrlsDto: GenerateMultipleUploadUrlsDto,
    @Request() req
  ) {
    try {
      const userId = req.user.userId;
      const { files } = generateMultipleUploadUrlsDto;

      this.logger.log(`Generating ${files.length} upload URLs for user ${userId}`);

      const results = await this.verificationService.generateMultipleUploadUrls(
        files,
        userId
      );

      return {
        success: true,
        data: {
          uploadUrls: results,
          count: results.length,
          expiresIn: 900,
        },
        message: `${results.length} upload URLs generated successfully`,
      };
    } catch (error) {
      this.logger.error('Error generating multiple upload URLs:', error);
      throw new HttpException(
        'Failed to generate upload URLs',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Post('upload-urls/driver-license')
  async generateDriverLicenseUploadUrl(
    @Body() body: { fileName: string; fileType: string },
    @Request() req
  ) {
    try {
      const userId = req.user.userId;
      const { fileName, fileType } = body;

      this.logger.log(`Generating driver license upload URL for user ${userId}`);

      const result = await this.verificationService.generateUploadUrl(
        fileName,
        fileType,
        userId,
        DocumentType.DRIVER_LICENSE
      );

      return {
        success: true,
        data: {
          uploadUrl: result.uploadUrl,
          fileKey: result.fileKey,
          documentType: DocumentType.DRIVER_LICENSE,
          fileName,
          expiresIn: 900,
        },
        message: 'Driver license upload URL generated successfully',
      };
    } catch (error) {
      this.logger.error('Error generating driver license upload URL:', error);
      throw new HttpException(
        'Failed to generate driver license upload URL',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Post('upload-urls/vehicle-registration')
  async generateVehicleRegistrationUploadUrl(
    @Body() body: { fileName: string; fileType: string },
    @Request() req
  ) {
    try {
      const userId = req.user.userId;
      const { fileName, fileType } = body;

      this.logger.log(`Generating vehicle registration upload URL for user ${userId}`);

      const result = await this.verificationService.generateUploadUrl(
        fileName,
        fileType,
        userId,
        DocumentType.VEHICLE_REGISTRATION
      );

      return {
        success: true,
        data: {
          uploadUrl: result.uploadUrl,
          fileKey: result.fileKey,
          documentType: DocumentType.VEHICLE_REGISTRATION,
          fileName,
          expiresIn: 900,
        },
        message: 'Vehicle registration upload URL generated successfully',
      };
    } catch (error) {
      this.logger.error('Error generating vehicle registration upload URL:', error);
      throw new HttpException(
        'Failed to generate vehicle registration upload URL',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Post('documents')
  async saveVerificationDocument(
    @Body() createDto: CreateVerificationDocumentDto,
    @Request() req
  ) {
    try {
      const userId = req.user.userId;
      
      this.logger.log(`Saving verification document for user ${userId}, type: ${createDto.documentType}`);

      const document = await this.verificationService.saveVerificationDocument(
        createDto,
        userId
      );

      return {
        success: true,
        data: document,
        message: 'Verification document saved successfully',
      };
    } catch (error) {
      this.logger.error('Error saving verification document:', error);
      throw new HttpException(
        'Failed to save verification document',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Get('documents')
  async getUserVerificationDocuments(@Request() req) {
    try {
      const userId = req.user.userId;
      
      this.logger.log(`Retrieving verification documents for user ${userId}`);

      const documents = await this.verificationService.getUserVerificationDocuments(userId);

      return {
        success: true,
        data: documents,
        count: documents.length,
        message: 'Verification documents retrieved successfully',
      };
    } catch (error) {
      this.logger.error('Error retrieving verification documents:', error);
      throw new HttpException(
        'Failed to retrieve verification documents',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Get('documents/status/:status')
  async getVerificationDocumentsByStatus(
    @Param('status') status: DocumentStatus,
    @Request() req
  ) {
    try {
      this.logger.log(`Retrieving verification documents with status: ${status}`);

      const documents = await this.verificationService.getVerificationDocumentsByStatus(status);

      return {
        success: true,
        data: documents,
        count: documents.length,
        message: `Verification documents with status ${status} retrieved successfully`,
      };
    } catch (error) {
      this.logger.error('Error retrieving verification documents by status:', error);
      throw new HttpException(
        'Failed to retrieve verification documents',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Get('documents/:id')
  async getVerificationDocument(@Param('id') id: string, @Request() req) {
    try {
      this.logger.log(`Retrieving verification document: ${id}`);

      const document = await this.verificationService.getVerificationDocumentById(id);

      return {
        success: true,
        data: document,
        message: 'Verification document retrieved successfully',
      };
    } catch (error) {
      this.logger.error('Error retrieving verification document:', error);
      throw new HttpException(
        'Failed to retrieve verification document',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Put('documents/:id/status')
  async updateDocumentStatus(
    @Param('id') id: string,
    @Body() updateDto: UpdateVerificationDocumentDto,
    @Request() req
  ) {
    try {
      const reviewedBy = req.user.userId;
      
      this.logger.log(`Updating document ${id} status to ${updateDto.status}`);

      const document = await this.verificationService.updateDocumentStatus(
        id,
        updateDto.status,
        reviewedBy,
        updateDto.rejectionReason
      );

      return {
        success: true,
        data: document,
        message: 'Document status updated successfully',
      };
    } catch (error) {
      this.logger.error('Error updating document status:', error);
      throw new HttpException(
        'Failed to update document status',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Delete('documents/:id')
  async deleteVerificationDocument(@Param('id') id: string, @Request() req) {
    try {
      const userId = req.user.userId;
      
      this.logger.log(`Deleting verification document ${id} for user ${userId}`);

      await this.verificationService.deleteVerificationDocument(id, userId);

      return {
        success: true,
        message: 'Verification document deleted successfully',
      };
    } catch (error) {
      this.logger.error('Error deleting verification document:', error);
      throw new HttpException(
        'Failed to delete verification document',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }
}
