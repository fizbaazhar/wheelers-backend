import { 
  Controller, 
  Post, 
  Get, 
  Put, 
  Delete, 
  Body, 
  Param, 
  UseGuards, 
  Request 
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { VehicleDetailsService } from './vehicle-details.service';
import { CreateVehicleDetailsDto } from './dto/create-vehicle-details.dto';
import { UpdateVehicleDetailsDto } from './dto/update-vehicle-details.dto';

@Controller('vehicle-details')
@UseGuards(JwtAuthGuard)
export class VehicleDetailsController {
  constructor(private readonly vehicleDetailsService: VehicleDetailsService) {}

  @Post()
  async createVehicleDetails(
    @Request() req,
    @Body() createVehicleDetailsDto: CreateVehicleDetailsDto
  ) {
    const vehicleDetails = await this.vehicleDetailsService.createVehicleDetails(
      req.user.userId,
      createVehicleDetailsDto
    );

    return {
      message: 'Vehicle details saved successfully',
      vehicleDetails
    };
  }

  @Get()
  async getUserVehicles(@Request() req) {
    const vehicles = await this.vehicleDetailsService.getUserVehicles(req.user.userId);
    
    return {
      message: 'User vehicles retrieved successfully',
      vehicles,
      count: vehicles.length
    };
  }

  @Get(':id')
  async getVehicleById(@Request() req, @Param('id') vehicleId: string) {
    const vehicle = await this.vehicleDetailsService.getVehicleById(vehicleId, req.user.userId);
    
    return {
      message: 'Vehicle details retrieved successfully',
      vehicle
    };
  }

  @Put(':id')
  async updateVehicleDetails(
    @Request() req,
    @Param('id') vehicleId: string,
    @Body() updateData: UpdateVehicleDetailsDto
  ) {
    const vehicle = await this.vehicleDetailsService.updateVehicleDetails(
      vehicleId,
      req.user.userId,
      updateData
    );

    return {
      message: 'Vehicle details updated successfully',
      vehicle
    };
  }

  @Delete(':id')
  async deleteVehicle(@Request() req, @Param('id') vehicleId: string) {
    await this.vehicleDetailsService.deleteVehicle(vehicleId, req.user.userId);
    
    return {
      message: 'Vehicle deleted successfully'
    };
  }
}
