import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { VehicleDetails } from '../models/vehicle-details.schema';
import { CreateVehicleDetailsDto } from './dto/create-vehicle-details.dto';
import { UpdateVehicleDetailsDto } from './dto/update-vehicle-details.dto';

@Injectable()
export class VehicleDetailsService {
  constructor(
    @InjectModel(VehicleDetails.name) 
    private vehicleDetailsModel: Model<VehicleDetails>
  ) {}

  async createVehicleDetails(
    userId: string, 
    createVehicleDetailsDto: CreateVehicleDetailsDto
  ): Promise<VehicleDetails> {
    // Check if license plate already exists
    const existingVehicle = await this.vehicleDetailsModel.findOne({
      licensePlateNum: createVehicleDetailsDto.licensePlateNum
    });

    if (existingVehicle) {
      throw new BadRequestException('Vehicle with this license plate number already exists');
    }

    // Create new vehicle details
    const vehicleDetails = new this.vehicleDetailsModel({
      userId,
      ...createVehicleDetailsDto,
      // Convert date strings to Date objects if provided
      registrationDate: createVehicleDetailsDto.registrationDate ? new Date(createVehicleDetailsDto.registrationDate) : undefined,
      insuranceExpiry: createVehicleDetailsDto.insuranceExpiry ? new Date(createVehicleDetailsDto.insuranceExpiry) : undefined,
      fitnessExpiry: createVehicleDetailsDto.fitnessExpiry ? new Date(createVehicleDetailsDto.fitnessExpiry) : undefined,
    });

    return vehicleDetails.save();
  }

  async getUserVehicles(userId: string): Promise<VehicleDetails[]> {
    return this.vehicleDetailsModel
      .find({ userId, isActive: true })
      .sort({ createdAt: -1 })
      .exec();
  }

  async getVehicleById(vehicleId: string, userId: string): Promise<VehicleDetails> {
    const vehicle = await this.vehicleDetailsModel.findOne({
      _id: vehicleId,
      userId,
      isActive: true
    }).exec();

    if (!vehicle) {
      throw new NotFoundException('Vehicle not found');
    }

    return vehicle;
  }

  async updateVehicleDetails(
    vehicleId: string,
    userId: string,
    updateData: UpdateVehicleDetailsDto
  ): Promise<VehicleDetails> {
    // First, verify the vehicle exists and belongs to the user
    const existingVehicle = await this.vehicleDetailsModel.findOne({
      _id: vehicleId,
      userId,
      isActive: true
    }).exec();

    if (!existingVehicle) {
      throw new NotFoundException('Vehicle not found');
    }

    // If license plate is being updated, check for conflicts
    if (updateData.licensePlateNum && updateData.licensePlateNum !== existingVehicle.licensePlateNum) {
      const conflictingVehicle = await this.vehicleDetailsModel.findOne({
        licensePlateNum: updateData.licensePlateNum,
        _id: { $ne: vehicleId },
        isActive: true
      }).exec();

      if (conflictingVehicle) {
        throw new BadRequestException('Vehicle with this license plate number already exists');
      }
    }

    // Prepare update data with date conversions
    const updatePayload: any = {};
    if (updateData.licensePlateNum !== undefined) updatePayload.licensePlateNum = updateData.licensePlateNum;
    if (updateData.modelYear !== undefined) updatePayload.modelYear = updateData.modelYear;
    if (updateData.makeModel !== undefined) updatePayload.makeModel = updateData.makeModel;
    if (updateData.category !== undefined) updatePayload.category = updateData.category;
    if (updateData.color !== undefined) updatePayload.color = updateData.color;
    if (updateData.engineNumber !== undefined) updatePayload.engineNumber = updateData.engineNumber;
    if (updateData.chassisNumber !== undefined) updatePayload.chassisNumber = updateData.chassisNumber;
    if (updateData.registrationDate !== undefined) {
      updatePayload.registrationDate = updateData.registrationDate ? new Date(updateData.registrationDate) : null;
    }
    if (updateData.insuranceExpiry !== undefined) {
      updatePayload.insuranceExpiry = updateData.insuranceExpiry ? new Date(updateData.insuranceExpiry) : null;
    }
    if (updateData.fitnessExpiry !== undefined) {
      updatePayload.fitnessExpiry = updateData.fitnessExpiry ? new Date(updateData.fitnessExpiry) : null;
    }

    const vehicle = await this.vehicleDetailsModel.findByIdAndUpdate(
      vehicleId,
      { $set: updatePayload },
      { new: true, runValidators: true }
    ).exec();

    if (!vehicle) {
      throw new NotFoundException('Vehicle not found');
    }

    return vehicle;
  }

  async deleteVehicle(vehicleId: string, userId: string): Promise<void> {
    const result = await this.vehicleDetailsModel.findOneAndUpdate(
      { _id: vehicleId, userId, isActive: true },
      { $set: { isActive: false } },
      { new: true }
    ).exec();

    if (!result) {
      throw new NotFoundException('Vehicle not found');
    }
  }
}
