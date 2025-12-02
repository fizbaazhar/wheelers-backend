import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { SavedPlace } from '../models/saved-place.schema';
import { CreateSavedPlaceDto } from './dto/create-saved-place.dto';
import { UpdateSavedPlaceDto } from './dto/update-saved-place.dto';

@Injectable()
export class SavedPlacesService {
  constructor(
    @InjectModel(SavedPlace.name) private readonly savedPlaceModel: Model<SavedPlace>,
  ) {}

  async create(userId: string, dto: CreateSavedPlaceDto): Promise<SavedPlace> {
    if (!dto.name || !dto.address || !dto.type) {
      throw new BadRequestException('name, address, and type are required');
    }

    const document = new this.savedPlaceModel({
      userId: new Types.ObjectId(userId),
      name: dto.name,
      address: dto.address,
      type: dto.type,
      latitude: dto.latitude,
      longitude: dto.longitude,
      city: dto.city,
      country: dto.country,
      postalCode: dto.postalCode,
      metadata: dto.metadata ?? {},
      isActive: true,
    });
    return document.save();
  }

  async list(userId: string): Promise<SavedPlace[]> {
    return this.savedPlaceModel
      .find({ userId: new Types.ObjectId(userId), isActive: true })
      .sort({ updatedAt: -1 })
      .exec();
  }

  async update(userId: string, id: string, dto: UpdateSavedPlaceDto): Promise<SavedPlace> {
    const place = await this.savedPlaceModel.findById(id).exec();
    if (!place || !place.isActive) {
      throw new NotFoundException('Saved place not found');
    }
    if (place.userId.toString() !== userId) {
      throw new ForbiddenException('You do not own this saved place');
    }

    if (dto.type === undefined && dto.name === undefined && dto.address === undefined &&
        dto.latitude === undefined && dto.longitude === undefined && dto.city === undefined &&
        dto.country === undefined && dto.postalCode === undefined && dto.metadata === undefined) {
      throw new BadRequestException('No fields provided to update');
    }

    Object.assign(place, dto);
    return place.save();
  }

  async softDelete(userId: string, id: string): Promise<void> {
    const place = await this.savedPlaceModel.findById(id).exec();
    if (!place || !place.isActive) {
      throw new NotFoundException('Saved place not found');
    }
    if (place.userId.toString() !== userId) {
      throw new ForbiddenException('You do not own this saved place');
    }
    place.isActive = false;
    await place.save();
  }
}


