import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { SavedPlace, SavedPlaceSchema } from '../models/saved-place.schema';
import { SavedPlacesService } from './saved-places.service';
import { SavedPlacesController } from './saved-places.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: SavedPlace.name, schema: SavedPlaceSchema },
    ]),
  ],
  controllers: [SavedPlacesController],
  providers: [SavedPlacesService],
  exports: [SavedPlacesService],
})
export class SavedPlacesModule {}


