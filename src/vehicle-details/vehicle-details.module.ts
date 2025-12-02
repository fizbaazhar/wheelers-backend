import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { VehicleDetailsController } from './vehicle-details.controller';
import { VehicleDetailsService } from './vehicle-details.service';
import { VehicleDetails, VehicleDetailsSchema } from '../models/vehicle-details.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: VehicleDetails.name, schema: VehicleDetailsSchema }
    ])
  ],
  controllers: [VehicleDetailsController],
  providers: [VehicleDetailsService],
  exports: [VehicleDetailsService]
})
export class VehicleDetailsModule {}
