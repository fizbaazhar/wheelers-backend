import { Controller, Post, Get, Body, Query, Param, Logger, UseGuards, Request } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CreateRideRequestDto, LocationDto } from '../websockets/dto/ride-request.dto';
import { DriverBidDto } from '../websockets/dto/driver-bid.dto';
import { AcceptBidDto } from '../websockets/dto/accept-bid.dto';
import { ReachedPickupDto } from '../websockets/dto/reached-pickup.dto';
import { StartRideDto } from '../websockets/dto/start-ride.dto';
import { RideCompletedDto } from '../websockets/dto/ride-completed.dto';
import { UpdateRideLocationDto } from './dto/update-ride-location.dto';
import { CancelRideDto } from './dto/cancel-ride.dto';
import { CancelRidePathDto } from './dto/cancel-ride-path.dto';
import { NotificationType } from '../websockets/dto/notification.dto';
import { WebsocketsGateway } from '../websockets/websockets.gateway';
import { UsersService } from '../users/users.service';
import { VehicleDetailsService } from '../vehicle-details/vehicle-details.service';
import { VehicleDetails } from '../models/vehicle-details.schema';
import { Ride } from '../websockets/schemas/ride.schema';
import { randomUUID } from 'crypto';

@Controller('rides')
@UseGuards(JwtAuthGuard)
export class RidesController {
  private readonly logger = new Logger(RidesController.name);

  constructor(
    private readonly websocketsGateway: WebsocketsGateway,
    private readonly usersService: UsersService,
    private readonly vehicleDetailsService: VehicleDetailsService,
    @InjectModel(Ride.name) private rideModel: Model<Ride>,
  ) {}

  @Get('history')
  async getRideHistory(
    @Request() req,
    @Query('limit') limit: string = '20',
    @Query('skip') skip: string = '0',
    @Query('status') status?: string,
  ) {
    try {
      const userId = req.user?.id || req.user?.sub;
      
      if (!userId) {
        return {
          success: false,
          message: 'User not authenticated',
          error: 'User ID not found in token'
        };
      }

      const limitNum = parseInt(limit, 10) || 20;
      const skipNum = parseInt(skip, 10) || 0;

      const query: any = {
        $or: [
          { driverId: userId },
          { passengerId: userId }
        ]
      };

      if (status && status !== 'all') {
        query.status = status;
      }

      const rides = await this.rideModel
        .find(query)
        .sort({ createdAt: -1 })
        .limit(limitNum)
        .skip(skipNum)
        .lean()
        .exec();

      const total = await this.rideModel.countDocuments(query);

      const ridesWithUserInfo = await Promise.all(
        rides.map(async (ride) => {
          const [driver, passenger] = await Promise.all([
            this.usersService.findById(ride.driverId),
            this.usersService.findById(ride.passengerId)
          ]);

          return {
            ...ride,
            driver: driver ? {
              id: driver._id,
              fullName: driver.fullName,
              phoneNumber: driver.phoneNumber,
              profilePicture: driver.profilePicture
            } : null,
            passenger: passenger ? {
              id: passenger._id,
              fullName: passenger.fullName,
              phoneNumber: passenger.phoneNumber,
              profilePicture: passenger.profilePicture
            } : null
          };
        })
      );

      return {
        success: true,
        message: 'Ride history retrieved successfully',
        data: {
          rides: ridesWithUserInfo,
          pagination: {
            total,
            limit: limitNum,
            skip: skipNum,
            hasMore: skipNum + limitNum < total
          }
        }
      };
    } catch (error) {
      this.logger.error('Error fetching ride history:', error);
      return {
        success: false,
        message: 'Failed to fetch ride history',
        error: error.message
      };
    }
  }

  @Post('request')
  async createRideRequest(@Body() createRideRequestDto: CreateRideRequestDto) {
    try {
      let normalizedStops: LocationDto[] | undefined = undefined;
      
      if (createRideRequestDto.stops && Array.isArray(createRideRequestDto.stops)) {
        normalizedStops = createRideRequestDto.stops
          .filter((stop: any) => stop && typeof stop === 'object' && stop.address)
          .map((stop: any) => ({
            address: stop.address,
            coordinate: stop.coordinate && typeof stop.coordinate === 'object' && 
                       typeof stop.coordinate.latitude === 'number' && 
                       typeof stop.coordinate.longitude === 'number'
              ? {
                  latitude: stop.coordinate.latitude,
                  longitude: stop.coordinate.longitude
                }
              : undefined
          }));
        
        if (normalizedStops.length === 0) {
          normalizedStops = undefined;
        }
      }
      
      // Generate unique ride request ID
      const rideRequestId = randomUUID();
      
      this.logger.log(`New ride request ${rideRequestId} from user ${createRideRequestDto.userId}`);
      this.logger.log(`Ride request vehicleType: ${createRideRequestDto.vehicleType || 'NOT SPECIFIED'}`);
      
      // Create ride request data with unique ID and normalized stops
      const rideRequestData = {
        ...createRideRequestDto,
        stops: normalizedStops,
        rideRequestId,
        timestamp: new Date().toISOString()
      };
      
      // Broadcast the ride request to all connected drivers
      await this.websocketsGateway.broadcastRideRequest(rideRequestData);
      
      return {
        success: true,
        message: 'Ride request sent to available drivers',
        data: rideRequestData
      };
    } catch (error) {
      this.logger.error('Error creating ride request:', error);
      this.logger.error('Error details:', JSON.stringify(error, null, 2));
      return {
        success: false,
        message: 'Failed to send ride request',
        error: error.message
      };
    }
  }

  @Post('bid')
  async submitDriverBid(@Body() driverBidDto: DriverBidDto, @Request() req) {
    try {
      // Get driver information from JWT token
      const driverId = req.user?.id || req.user?.sub;
      const driver = await this.usersService.findById(driverId);
      
      if (!driver) {
        return {
          success: false,
          message: 'Driver not found',
          error: 'Driver not found in database'
        };
      }

      let vehicleDetails: VehicleDetails | null = null;
      try {
        const vehicles = await this.vehicleDetailsService.getUserVehicles(driverId);
        if (vehicles && vehicles.length > 0) {
          if (driverBidDto.vehicleType) {
            const matchingVehicle = vehicles.find(v => v.category === driverBidDto.vehicleType);
            if (matchingVehicle) {
              vehicleDetails = matchingVehicle;
              this.logger.log(`Found matching vehicle for driver ${driverId} (${driverBidDto.vehicleType}): ${vehicleDetails.licensePlateNum} - ${vehicleDetails.makeModel}`);
            } else {
              this.logger.warn(`No matching vehicle found for driver ${driverId} with type ${driverBidDto.vehicleType}, using first available vehicle`);
              vehicleDetails = vehicles[0];
            }
          } else {
            vehicleDetails = vehicles[0];
            this.logger.log(`Found vehicle for driver ${driverId}: ${vehicleDetails.licensePlateNum} - ${vehicleDetails.makeModel}`);
          }
        } else {
          this.logger.warn(`No active vehicles found for driver ${driverId}`);
        }
      } catch (error) {
        this.logger.warn(`Error fetching vehicle for driver ${driverId}:`, error.message);
      }

      // Create enhanced bid data with driver information from database
      const enhancedBidData: any = {
        ...driverBidDto,
        driverId: driverId,
        driverName: driver.fullName || 'Unknown Driver',
        driverPhone: driver.phoneNumber,
      };

      if (vehicleDetails) {
        enhancedBidData.vehicleNumberPlate = vehicleDetails.licensePlateNum;
        enhancedBidData.vehicleName = vehicleDetails.makeModel;
        enhancedBidData.vehicleType = vehicleDetails.category;
      }

      this.logger.log(`Driver ${driverId} (${driver.fullName}) bidding on ride request ${driverBidDto.rideRequestId}`);
      
      await this.websocketsGateway.broadcastDriverBid(driverBidDto.rideRequestId, enhancedBidData);
      
      const responseData: any = {
        ...enhancedBidData,
        timestamp: new Date().toISOString()
      };

      if (vehicleDetails) {
        responseData.vehicleNumberPlate = vehicleDetails.licensePlateNum;
        responseData.vehicleName = vehicleDetails.makeModel;
      }
      
      return {
        success: true,
        message: 'Driver bid submitted successfully',
        data: responseData
      };
    } catch (error) {
      this.logger.error('Error submitting driver bid:', error);
      return {
        success: false,
        message: 'Failed to submit driver bid',
        error: error.message
      };
    }
  }

  @Post('accept-bid')
  async acceptDriverBid(@Body() acceptBidDto: AcceptBidDto, @Request() req) {
    try {
      // Get user information from JWT token
      const userId = req.user?.id || req.user?.sub;
      const user = await this.usersService.findById(userId);
      
      if (!user) {
        return {
          success: false,
          message: 'User not found',
          error: 'User not found in database'
        };
      }

      // Get driver information
      const driver = await this.usersService.findById(acceptBidDto.driverId);
      if (!driver) {
        return {
          success: false,
          message: 'Driver not found',
          error: 'Driver not found in database'
        };
      }

      let vehicleDetails: VehicleDetails | null = null;
      try {
        const vehicles = await this.vehicleDetailsService.getUserVehicles(acceptBidDto.driverId);
        if (vehicles && vehicles.length > 0) {
          vehicleDetails = vehicles[0];
          this.logger.log(`Found vehicle for driver ${acceptBidDto.driverId}: ${vehicleDetails.licensePlateNum} - ${vehicleDetails.makeModel}`);
        } else {
          this.logger.warn(`No active vehicles found for driver ${acceptBidDto.driverId}`);
        }
      } catch (error) {
        this.logger.warn(`Error fetching vehicle for driver ${acceptBidDto.driverId}:`, error.message);
      }

      const rideData: any = {
        driverId: acceptBidDto.driverId,
        passengerId: userId,
        status: 'accepted',
        vehicleType: acceptBidDto.vehicleType, // Required field
        estimatedFare: acceptBidDto.acceptedBidAmount,
        actualFare: acceptBidDto.acceptedBidAmount,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      if (acceptBidDto.rideDetails) {
        rideData.rideDetails = acceptBidDto.rideDetails;
      }

      if (acceptBidDto.pickupLocation) {
        rideData.pickupLocation = {
          address: acceptBidDto.pickupLocation.address,
          coordinate: acceptBidDto.pickupLocation.coordinate ? {
            latitude: acceptBidDto.pickupLocation.coordinate.latitude,
            longitude: acceptBidDto.pickupLocation.coordinate.longitude
          } : undefined
        };
      }

      if (acceptBidDto.destinationLocation) {
        rideData.destinationLocation = {
          address: acceptBidDto.destinationLocation.address,
          coordinate: acceptBidDto.destinationLocation.coordinate ? {
            latitude: acceptBidDto.destinationLocation.coordinate.latitude,
            longitude: acceptBidDto.destinationLocation.coordinate.longitude
          } : undefined
        };
      }

      if (acceptBidDto.stops && Array.isArray(acceptBidDto.stops) && acceptBidDto.stops.length > 0) {
        rideData.stops = acceptBidDto.stops.map(stop => ({
          address: stop.address,
          coordinate: stop.coordinate ? {
            latitude: stop.coordinate.latitude,
            longitude: stop.coordinate.longitude
          } : undefined
        }));
      }

      const newRide = new this.rideModel(rideData);

      const savedRide = await newRide.save();
      
      this.logger.log(`User ${userId} accepted bid from driver ${acceptBidDto.driverId} for ride ${savedRide._id}`);

      // Emit WebSocket events
      // Notify the driver that their bid was accepted
      await this.websocketsGateway.sendNotification(acceptBidDto.driverId, {
        recipientId: acceptBidDto.driverId,
        type: NotificationType.BID_ACCEPTED,
        title: 'Bid Accepted!',
        message: `Your bid has been accepted by ${user.fullName || 'User'}`,
        rideId: savedRide._id.toString(),
        data: {
          rideId: savedRide._id.toString(),
          passengerId: userId,
          passengerName: user.fullName || 'User',
          passengerPhone: user.phoneNumber,
          acceptedBidAmount: acceptBidDto.acceptedBidAmount,
          message: acceptBidDto.message
        }
      });

      // Notify the user that the ride has been confirmed
      await this.websocketsGateway.sendNotification(userId, {
        recipientId: userId,
        type: NotificationType.RIDE_CONFIRMED,
        title: 'Ride Confirmed!',
        message: `Your ride with ${driver.fullName || 'Driver'} has been confirmed`,
        rideId: savedRide._id.toString(),
        data: {
          rideId: savedRide._id.toString(),
          driverId: acceptBidDto.driverId,
          driverName: driver.fullName || 'Driver',
          driverPhone: driver.phoneNumber,
          acceptedBidAmount: acceptBidDto.acceptedBidAmount,
          message: acceptBidDto.message
        }
      });

      const broadcastData: any = {
        rideRequestId: acceptBidDto.rideRequestId,
        rideId: savedRide._id.toString(),
        driverId: acceptBidDto.driverId,
        driverName: driver.fullName || 'Driver',
        passengerId: userId,
        passengerName: user.fullName || 'User',
        acceptedBidAmount: acceptBidDto.acceptedBidAmount,
        timestamp: new Date().toISOString()
      };

      if (vehicleDetails) {
        broadcastData.vehicleNumberPlate = vehicleDetails.licensePlateNum;
        broadcastData.vehicleName = vehicleDetails.makeModel;
      }

      await this.websocketsGateway.broadcastToAll('bid_accepted', broadcastData);

      const responseData: any = {
        rideRequestId: acceptBidDto.rideRequestId,
        rideId: savedRide._id.toString(),
        driverId: acceptBidDto.driverId,
        driverName: driver.fullName || 'Driver',
        driverPhone: driver.phoneNumber,
        passengerId: userId,
        passengerName: user.fullName || 'User',
        acceptedBidAmount: acceptBidDto.acceptedBidAmount,
        status: 'accepted',
        timestamp: new Date().toISOString()
      };

      if (vehicleDetails) {
        responseData.vehicleNumberPlate = vehicleDetails.licensePlateNum;
        responseData.vehicleName = vehicleDetails.makeModel;
      }

      return {
        success: true,
        message: 'Driver bid accepted successfully',
        data: responseData
      };
    } catch (error) {
      this.logger.error('Error accepting driver bid:', error);
      return {
        success: false,
        message: 'Failed to accept driver bid',
        error: error.message
      };
    }
  }

  @Post('reached-pickup')
  async reachedPickupPoint(@Body() reachedPickupDto: ReachedPickupDto, @Request() req) {
    try {
      // Get driver information from JWT token
      const driverId = req.user?.id || req.user?.sub;
      const driver = await this.usersService.findById(driverId);
      
      if (!driver) {
        return {
          success: false,
          message: 'Driver not found',
          error: 'Driver not found in database'
        };
      }

      if (!Types.ObjectId.isValid(reachedPickupDto.rideId)) {
        return {
          success: false,
          message: 'Invalid ride ID format',
          error: 'Ride ID must be a valid MongoDB ObjectId'
        };
      }

      // Find the ride
      const ride = await this.rideModel.findById(reachedPickupDto.rideId);
      if (!ride) {
        return {
          success: false,
          message: 'Ride not found',
          error: 'Ride not found in database'
        };
      }

      // Verify the driver is assigned to this ride
      if (ride.driverId !== driverId) {
        return {
          success: false,
          message: 'Unauthorized',
          error: 'Driver not assigned to this ride'
        };
      }

      // Update ride status
      ride.status = 'in_progress';
      
      if (reachedPickupDto.latitude !== undefined && reachedPickupDto.longitude !== undefined) {
        ride.currentLocation = {
          coordinate: {
            latitude: reachedPickupDto.latitude,
            longitude: reachedPickupDto.longitude
          },
          timestamp: new Date()
        };
      }
      
      ride.updatedAt = new Date();
      await ride.save();

      this.logger.log(`Driver ${driverId} reached pickup point for ride ${reachedPickupDto.rideId}`);

      // Get passenger information
      const passenger = await this.usersService.findById(ride.passengerId);
      
      // Emit WebSocket events
      // Notify the passenger that driver has reached pickup point
      await this.websocketsGateway.sendNotification(ride.passengerId, {
        recipientId: ride.passengerId,
        type: NotificationType.DRIVER_REACHED_PICKUP,
        title: 'Driver Arrived!',
        message: `${driver.fullName || 'Driver'} has reached your pickup location`,
        rideId: reachedPickupDto.rideId,
        data: {
          rideId: reachedPickupDto.rideId,
          driverId: driverId,
          driverName: driver.fullName || 'Driver',
          driverPhone: driver.phoneNumber,
          message: reachedPickupDto.message,
          latitude: reachedPickupDto.latitude,
          longitude: reachedPickupDto.longitude,
          timestamp: new Date().toISOString()
        }
      });

      // Broadcast to ride chat room
      await this.websocketsGateway.broadcastRideMessage(reachedPickupDto.rideId, {
        messageId: require('crypto').randomUUID(),
        rideId: reachedPickupDto.rideId,
        senderId: driverId,
        message: reachedPickupDto.message || 'I have reached the pickup location',
        messageType: 'system',
        timestamp: new Date().toISOString()
      });

      // Also broadcast globally for development/testing
      await this.websocketsGateway.broadcastToAll('driver_reached_pickup', {
        rideId: reachedPickupDto.rideId,
        driverId: driverId,
        driverName: driver.fullName || 'Driver',
        driverPhone: driver.phoneNumber,
        passengerId: ride.passengerId,
        passengerName: passenger?.fullName || 'Passenger',
        message: reachedPickupDto.message,
        latitude: reachedPickupDto.latitude,
        longitude: reachedPickupDto.longitude,
        timestamp: new Date().toISOString()
      });

      return {
        success: true,
        message: 'Pickup point reached successfully',
        data: {
          rideId: reachedPickupDto.rideId,
          driverId: driverId,
          driverName: driver.fullName || 'Driver',
          passengerId: ride.passengerId,
          passengerName: passenger?.fullName || 'Passenger',
          status: 'in_progress',
          timestamp: new Date().toISOString()
        }
      };
    } catch (error) {
      this.logger.error('Error updating pickup status:', error);
      return {
        success: false,
        message: 'Failed to update pickup status',
        error: error.message
      };
    }
  }

  @Post('start')
  async startRide(@Body() startRideDto: StartRideDto, @Request() req) {
    try {
      // Get driver information from JWT token
      const driverId = req.user?.id || req.user?.sub;
      const driver = await this.usersService.findById(driverId);
      
      if (!driver) {
        return {
          success: false,
          message: 'Driver not found',
          error: 'Driver not found in database'
        };
      }

      if (!Types.ObjectId.isValid(startRideDto.rideId)) {
        return {
          success: false,
          message: 'Invalid ride ID format',
          error: 'Ride ID must be a valid MongoDB ObjectId'
        };
      }

      // Find the ride
      const ride = await this.rideModel.findById(startRideDto.rideId);
      if (!ride) {
        return {
          success: false,
          message: 'Ride not found',
          error: 'Ride not found in database'
        };
      }

      // Verify the driver is assigned to this ride
      if (ride.driverId !== driverId) {
        return {
          success: false,
          message: 'Unauthorized',
          error: 'Driver not assigned to this ride'
        };
      }

      // Verify ride is in the correct status (should be 'in_progress' after reached pickup)
      if (ride.status !== 'in_progress') {
        return {
          success: false,
          message: 'Invalid ride status',
          error: 'Ride must be in progress to start. Please reach pickup point first.'
        };
      }

      // Update ride status (keeping it as 'in_progress' but marking as started)
      ride.updatedAt = new Date();
      await ride.save();

      this.logger.log(`Driver ${driverId} started ride ${startRideDto.rideId}`);

      // Get passenger information
      const passenger = await this.usersService.findById(ride.passengerId);
      
      // Emit WebSocket events
      // Notify the passenger that ride has started
      await this.websocketsGateway.sendNotification(ride.passengerId, {
        recipientId: ride.passengerId,
        type: NotificationType.RIDE_STARTED,
        title: 'Ride Started!',
        message: `Your ride with ${driver.fullName || 'Driver'} has started`,
        rideId: startRideDto.rideId,
        data: {
          rideId: startRideDto.rideId,
          driverId: driverId,
          driverName: driver.fullName || 'Driver',
          driverPhone: driver.phoneNumber,
          message: startRideDto.message,
          timestamp: new Date().toISOString()
        }
      });

      // Broadcast to ride chat room
      await this.websocketsGateway.broadcastRideMessage(startRideDto.rideId, {
        messageId: require('crypto').randomUUID(),
        rideId: startRideDto.rideId,
        senderId: driverId,
        message: startRideDto.message || 'Ride has started. Let\'s go!',
        messageType: 'system',
        timestamp: new Date().toISOString()
      });

      // Also broadcast globally for development/testing
      await this.websocketsGateway.broadcastToAll('ride_started', {
        rideId: startRideDto.rideId,
        driverId: driverId,
        driverName: driver.fullName || 'Driver',
        driverPhone: driver.phoneNumber,
        passengerId: ride.passengerId,
        passengerName: passenger?.fullName || 'Passenger',
        message: startRideDto.message,
        timestamp: new Date().toISOString()
      });

      return {
        success: true,
        message: 'Ride started successfully',
        data: {
          rideId: startRideDto.rideId,
          driverId: driverId,
          driverName: driver.fullName || 'Driver',
          passengerId: ride.passengerId,
          passengerName: passenger?.fullName || 'Passenger',
          status: 'in_progress',
          timestamp: new Date().toISOString()
        }
      };
    } catch (error) {
      this.logger.error('Error starting ride:', error);
      return {
        success: false,
        message: 'Failed to start ride',
        error: error.message
      };
    }
  }

  @Post('completed')
  async rideCompleted(@Body() rideCompletedDto: RideCompletedDto, @Request() req) {
    try {
      // Get driver information from JWT token
      const driverId = req.user?.id || req.user?.sub;
      const driver = await this.usersService.findById(driverId);
      
      if (!driver) {
        return {
          success: false,
          message: 'Driver not found',
          error: 'Driver not found in database'
        };
      }

      if (!Types.ObjectId.isValid(rideCompletedDto.rideId)) {
        return {
          success: false,
          message: 'Invalid ride ID format',
          error: 'Ride ID must be a valid MongoDB ObjectId'
        };
      }

      // Find the ride
      const ride = await this.rideModel.findById(rideCompletedDto.rideId);
      if (!ride) {
        return {
          success: false,
          message: 'Ride not found',
          error: 'Ride not found in database'
        };
      }

      // Verify the driver is assigned to this ride
      if (ride.driverId !== driverId) {
        return {
          success: false,
          message: 'Unauthorized',
          error: 'Driver not assigned to this ride'
        };
      }

      // Update ride status and final details
      ride.status = 'completed';
      if (rideCompletedDto.finalFare) {
        ride.actualFare = rideCompletedDto.finalFare;
      }
      if (rideCompletedDto.distance) {
        ride.distance = rideCompletedDto.distance;
      }
      if (rideCompletedDto.duration) {
        ride.duration = rideCompletedDto.duration;
      }
      
      if (rideCompletedDto.finalLatitude !== undefined && rideCompletedDto.finalLongitude !== undefined) {
        ride.currentLocation = {
          coordinate: {
            latitude: rideCompletedDto.finalLatitude,
            longitude: rideCompletedDto.finalLongitude
          },
          address: rideCompletedDto.finalAddress,
          timestamp: new Date()
        };
      }
      
      ride.updatedAt = new Date();
      await ride.save();

      this.logger.log(`Driver ${driverId} completed ride ${rideCompletedDto.rideId}`);

      // Get passenger information
      const passenger = await this.usersService.findById(ride.passengerId);
      
      // Emit WebSocket events
      // Notify the passenger that ride is completed
      await this.websocketsGateway.sendNotification(ride.passengerId, {
        recipientId: ride.passengerId,
        type: NotificationType.RIDE_COMPLETED,
        title: 'Ride Completed!',
        message: `Your ride with ${driver.fullName || 'Driver'} has been completed`,
        rideId: rideCompletedDto.rideId,
        data: {
          rideId: rideCompletedDto.rideId,
          driverId: driverId,
          driverName: driver.fullName || 'Driver',
          driverPhone: driver.phoneNumber,
          finalFare: rideCompletedDto.finalFare || ride.actualFare,
          distance: rideCompletedDto.distance,
          duration: rideCompletedDto.duration,
          message: rideCompletedDto.message,
          timestamp: new Date().toISOString()
        }
      });

      // Broadcast to ride chat room
      await this.websocketsGateway.broadcastRideMessage(rideCompletedDto.rideId, {
        messageId: require('crypto').randomUUID(),
        rideId: rideCompletedDto.rideId,
        senderId: driverId,
        message: rideCompletedDto.message || 'Ride completed successfully. Thank you!',
        messageType: 'system',
        timestamp: new Date().toISOString()
      });

      // Also broadcast globally for development/testing
      await this.websocketsGateway.broadcastToAll('ride_completed', {
        rideId: rideCompletedDto.rideId,
        driverId: driverId,
        driverName: driver.fullName || 'Driver',
        driverPhone: driver.phoneNumber,
        passengerId: ride.passengerId,
        passengerName: passenger?.fullName || 'Passenger',
        finalFare: rideCompletedDto.finalFare || ride.actualFare,
        distance: rideCompletedDto.distance,
        duration: rideCompletedDto.duration,
        message: rideCompletedDto.message,
        timestamp: new Date().toISOString()
      });

      return {
        success: true,
        message: 'Ride completed successfully',
        data: {
          rideId: rideCompletedDto.rideId,
          driverId: driverId,
          driverName: driver.fullName || 'Driver',
          passengerId: ride.passengerId,
          passengerName: passenger?.fullName || 'Passenger',
          finalFare: rideCompletedDto.finalFare || ride.actualFare,
          distance: rideCompletedDto.distance,
          duration: rideCompletedDto.duration,
          status: 'completed',
          timestamp: new Date().toISOString()
        }
      };
    } catch (error) {
      this.logger.error('Error completing ride:', error);
      return {
        success: false,
        message: 'Failed to complete ride',
        error: error.message
      };
    }
  }

  @Post('update-location')
  async updateRideLocation(@Body() updateLocationDto: UpdateRideLocationDto, @Request() req) {
    try {
      const userId = req.user?.id || req.user?.sub;
      
      if (!Types.ObjectId.isValid(updateLocationDto.rideId)) {
        return {
          success: false,
          message: 'Invalid ride ID format',
          error: 'Ride ID must be a valid MongoDB ObjectId'
        };
      }
      
      const ride = await this.rideModel.findById(updateLocationDto.rideId);
      if (!ride) {
        return {
          success: false,
          message: 'Ride not found',
          error: 'Ride not found in database'
        };
      }

      if (ride.driverId !== userId && ride.passengerId !== userId) {
        return {
          success: false,
          message: 'Unauthorized',
          error: 'User not part of this ride'
        };
      }

      ride.currentLocation = {
        coordinate: {
          latitude: updateLocationDto.latitude,
          longitude: updateLocationDto.longitude
        },
        address: updateLocationDto.address,
        timestamp: new Date()
      };
      ride.updatedAt = new Date();
      await ride.save();

      this.logger.log(`Updated location for ride ${updateLocationDto.rideId} by user ${userId}`);

      return {
        success: true,
        message: 'Ride location updated successfully',
        data: {
          rideId: updateLocationDto.rideId,
          currentLocation: ride.currentLocation,
          timestamp: new Date().toISOString()
        }
      };
    } catch (error) {
      this.logger.error('Error updating ride location:', error);
      return {
        success: false,
        message: 'Failed to update ride location',
        error: error.message
      };
    }
  }

  @Post('cancel')
  async cancelRide(@Body() cancelRideDto: CancelRideDto, @Request() req) {
    try {
      const userId = req.user?.id || req.user?.sub;
      
      if (!Types.ObjectId.isValid(cancelRideDto.rideId)) {
        return {
          success: false,
          message: 'Invalid ride ID format',
          error: 'Ride ID must be a valid MongoDB ObjectId. If you are using a ride request ID, please use the actual ride ID instead.'
        };
      }
      
      const ride = await this.rideModel.findById(cancelRideDto.rideId);
      if (!ride) {
        return {
          success: false,
          message: 'Ride not found',
          error: 'Ride not found in database'
        };
      }

      if (ride.driverId !== userId && ride.passengerId !== userId) {
        return {
          success: false,
          message: 'Unauthorized',
          error: 'User not part of this ride'
        };
      }

      if (ride.status === 'completed') {
        return {
          success: false,
          message: 'Cannot cancel ride',
          error: 'Ride has already been completed'
        };
      }

      if (ride.status === 'cancelled') {
        return {
          success: false,
          message: 'Ride already cancelled',
          error: 'This ride has already been cancelled'
        };
      }

      const isDriver = ride.driverId === userId;
      const isPassenger = ride.passengerId === userId;

      const user = await this.usersService.findById(userId);
      if (!user) {
        return {
          success: false,
          message: 'User not found',
          error: 'User not found in database'
        };
      }

      const otherPartyId = isDriver ? ride.passengerId : ride.driverId;
      const otherParty = await this.usersService.findById(otherPartyId);

      ride.status = 'cancelled';
      ride.cancelReason = cancelRideDto.reason;
      ride.cancelledBy = isDriver ? 'driver' : 'passenger';
      ride.cancelledById = userId;
      ride.cancelledAt = new Date();
      ride.updatedAt = new Date();
      await ride.save();

      this.logger.log(`Ride ${cancelRideDto.rideId} cancelled by ${isDriver ? 'driver' : 'passenger'} ${userId}`);

      const cancelledBy = isDriver ? 'driver' : 'passenger';
      const cancelledByName = user.fullName || (isDriver ? 'Driver' : 'Passenger');

      if (otherParty) {
        await this.websocketsGateway.sendNotification(otherPartyId, {
          recipientId: otherPartyId,
          type: NotificationType.RIDE_CANCELLED,
          title: 'Ride Cancelled',
          message: `${cancelledByName} has cancelled the ride`,
          rideId: cancelRideDto.rideId,
          data: {
            rideId: cancelRideDto.rideId,
            cancelledBy: cancelledBy,
            cancelledById: userId,
            cancelledByName: cancelledByName,
            reason: cancelRideDto.reason,
            timestamp: new Date().toISOString()
          }
        });
      }

      await this.websocketsGateway.sendNotification(userId, {
        recipientId: userId,
        type: NotificationType.RIDE_CANCELLED,
        title: 'Ride Cancelled',
        message: 'You have cancelled the ride',
        rideId: cancelRideDto.rideId,
        data: {
          rideId: cancelRideDto.rideId,
          cancelledBy: cancelledBy,
          cancelledById: userId,
          reason: cancelRideDto.reason,
          timestamp: new Date().toISOString()
        }
      });

      await this.websocketsGateway.broadcastRideMessage(cancelRideDto.rideId, {
        messageId: require('crypto').randomUUID(),
        rideId: cancelRideDto.rideId,
        senderId: userId,
        message: cancelRideDto.reason || `Ride cancelled by ${cancelledByName}`,
        messageType: 'system',
        timestamp: new Date().toISOString()
      });

      await this.websocketsGateway.broadcastToAll('ride_cancelled', {
        rideId: cancelRideDto.rideId,
        driverId: ride.driverId,
        passengerId: ride.passengerId,
        cancelledBy: cancelledBy,
        cancelledById: userId,
        cancelledByName: cancelledByName,
        reason: cancelRideDto.reason,
        timestamp: new Date().toISOString()
      });

      return {
        success: true,
        message: 'Ride cancelled successfully',
        data: {
          rideId: cancelRideDto.rideId,
          status: 'cancelled',
          cancelledBy: cancelledBy,
          cancelledById: userId,
          cancelledByName: cancelledByName,
          reason: cancelRideDto.reason,
          timestamp: new Date().toISOString()
        }
      };
    } catch (error) {
      this.logger.error('Error cancelling ride:', error);
      return {
        success: false,
        message: 'Failed to cancel ride',
        error: error.message
      };
    }
  }

  @Post(':rideId/cancel')
  async cancelRideByPath(
    @Param('rideId') rideId: string,
    @Body() cancelRidePathDto: CancelRidePathDto,
    @Request() req,
  ) {
    const cancelRideDto: CancelRideDto = {
      rideId,
      reason: cancelRidePathDto.reason
    };
    
    return this.cancelRide(cancelRideDto, req);
  }
}
