import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { VerificationController } from './verification.controller';
import { VerificationService } from './verification.service';
import { 
  VerificationDocumentSchema, 
  VerificationDocumentSchemaFactory 
} from '../models/verification-document.schema';

@Module({
  imports: [
    ConfigModule,
    MongooseModule.forFeature([
      { name: VerificationDocumentSchema.name, schema: VerificationDocumentSchemaFactory },
    ]),
  ],
  controllers: [VerificationController],
  providers: [VerificationService],
  exports: [VerificationService],
})
export class VerificationModule {}
