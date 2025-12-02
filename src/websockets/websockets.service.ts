import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { JwtService } from '@nestjs/jwt';
import { ChatMessageDto } from './dto/chat-message.dto';
import { LocationUpdateDto } from './dto/ride-update.dto';
import { NotificationDto } from './dto/notification.dto';
import { Ride, RideDocument } from './schemas/ride.schema';

// Define interfaces for the data structures
interface ChatMessage {
  _id?: string;
  message: string;
  rideId: string;
  senderId: string;
  messageType?: 'text' | 'image' | 'location' | 'system';
  timestamp: string;
  createdAt?: Date;
  updatedAt?: Date;
}

interface UserLocation {
  _id?: string;
  userId: string;
  rideId: string;
  latitude: number;
  longitude: number;
  accuracy?: number;
  speed?: number;
  timestamp: string;
  createdAt?: Date;
  updatedAt?: Date;
}


@Injectable()
export class WebsocketsService {
  private readonly logger = new Logger(WebsocketsService.name);

  constructor(
    @InjectModel('ChatMessage') private chatMessageModel: Model<ChatMessage>,
    @InjectModel('UserLocation') private userLocationModel: Model<UserLocation>,
    @InjectModel(Ride.name) private rideModel: Model<RideDocument>,
    @InjectModel('RideMessage') private rideMessageModel: Model<any>,
    private jwtService: JwtService,
  ) {}

  /**
   * Verify JWT token and extract user ID
   */
  async verifyTokenAndGetUserId(token: string): Promise<string | null> {
    try {
      const jwtSecret = process.env.JWT_SECRET;
      if (!jwtSecret) {
        this.logger.error('JWT_SECRET environment variable is not set');
        return null;
      }
      const payload = this.jwtService.verify(token, { secret: jwtSecret });
      return payload.sub || payload.userId || null;
    } catch (error) {
      this.logger.error('Token verification failed:', error);
      return null;
    }
  }

  /**
   * Validate that user is part of a specific ride
   */
  async validateUserInRide(rideId: string, userId: string): Promise<boolean> {
    try {
      if (!rideId || !userId) {
        return false;
      }

      // For development/testing, allow any rideId if it's not a valid ObjectId
      if (!rideId.match(/^[0-9a-fA-F]{24}$/)) {
        this.logger.warn(`Ride ID ${rideId} is not a valid ObjectId, allowing for development`);
        return true;
      }

      const ride = await this.rideModel.findById(rideId).exec();
      if (!ride) {
        this.logger.warn(`Ride ${rideId} not found`);
        return false;
      }

      const driverIdStr = String(ride.driverId);
      const passengerIdStr = String(ride.passengerId);
      const userIdStr = String(userId);

      const isAuthorized = driverIdStr === userIdStr || passengerIdStr === userIdStr;
      
      if (!isAuthorized) {
        this.logger.warn(`User ${userId} not authorized for ride ${rideId}. Driver: ${driverIdStr}, Passenger: ${passengerIdStr}`);
      }

      return isAuthorized;
    } catch (error) {
      this.logger.error('Error validating user in ride:', error);
      return false;
    }
  }

  /**
   * Save chat message to database
   */
  async saveChatMessage(messageData: ChatMessageDto & { timestamp: string }): Promise<ChatMessage> {
    try {
      const chatMessage = new this.chatMessageModel({
        message: messageData.message,
        rideId: messageData.rideId,
        senderId: messageData.senderId,
        messageType: messageData.messageType || 'text',
        timestamp: messageData.timestamp,
      });

      const savedMessage = await chatMessage.save();
      this.logger.log(`Chat message saved for ride ${messageData.rideId}`);
      
      return savedMessage;
    } catch (error) {
      this.logger.error('Error saving chat message:', error);
      throw error;
    }
  }

  /**
   * Get chat messages for a specific ride
   */
  async getChatMessages(rideId: string, limit: number = 50, offset: number = 0): Promise<ChatMessage[]> {
    try {
      const messages = await this.chatMessageModel
        .find({ rideId })
        .sort({ createdAt: -1 })
        .limit(limit)
        .skip(offset)
        .exec();

      return messages.reverse(); // Return in chronological order
    } catch (error) {
      this.logger.error('Error fetching chat messages:', error);
      throw error;
    }
  }

  /**
   * Update user location
   */
  async updateUserLocation(locationData: LocationUpdateDto & { userId: string }): Promise<UserLocation> {
    try {
      // Find existing location record or create new one
      const existingLocation = await this.userLocationModel.findOne({
        userId: locationData.userId,
        rideId: locationData.rideId,
      }).exec();

      if (existingLocation) {
        // Update existing location
        existingLocation.latitude = locationData.latitude;
        existingLocation.longitude = locationData.longitude;
        existingLocation.accuracy = locationData.accuracy;
        existingLocation.speed = locationData.speed;
        existingLocation.timestamp = new Date().toISOString();
        
        const updatedLocation = await existingLocation.save();
        this.logger.log(`Location updated for user ${locationData.userId} in ride ${locationData.rideId}`);
        return updatedLocation;
      } else {
        // Create new location record
        const userLocation = new this.userLocationModel({
          userId: locationData.userId,
          rideId: locationData.rideId,
          latitude: locationData.latitude,
          longitude: locationData.longitude,
          accuracy: locationData.accuracy,
          speed: locationData.speed,
          timestamp: new Date().toISOString(),
        });

        const savedLocation = await userLocation.save();
        this.logger.log(`New location saved for user ${locationData.userId} in ride ${locationData.rideId}`);
        return savedLocation;
      }
    } catch (error) {
      this.logger.error('Error updating user location:', error);
      throw error;
    }
  }

  /**
   * Get user locations for a specific ride
   */
  async getUserLocations(rideId: string): Promise<UserLocation[]> {
    try {
      const locations = await this.userLocationModel
        .find({ rideId })
        .sort({ updatedAt: -1 })
        .exec();

      return locations;
    } catch (error) {
      this.logger.error('Error fetching user locations:', error);
      throw error;
    }
  }

  /**
   * Get ride details
   */
  async getRideDetails(rideId: string): Promise<Ride | null> {
    try {
      const ride = await this.rideModel.findById(rideId).exec();
      return ride;
    } catch (error) {
      this.logger.error('Error fetching ride details:', error);
      return null;
    }
  }

  /**
   * Create a system message for ride events
   */
  async createSystemMessage(rideId: string, message: string, messageType: 'system' = 'system'): Promise<ChatMessage> {
    try {
      const systemMessage = new this.chatMessageModel({
        message,
        rideId,
        senderId: 'system',
        messageType,
        timestamp: new Date().toISOString(),
      });

      const savedMessage = await systemMessage.save();
      this.logger.log(`System message created for ride ${rideId}`);
      
      return savedMessage;
    } catch (error) {
      this.logger.error('Error creating system message:', error);
      throw error;
    }
  }

  /**
   * Get online users count for a specific ride
   */
  async getOnlineUsersForRide(rideId: string): Promise<number> {
    try {
      const ride = await this.rideModel.findById(rideId).exec();
      if (!ride) {
        return 0;
      }

      // This would typically check against a Redis cache or in-memory store
      // For now, we'll return a placeholder
      return 2; // Driver + Passenger
    } catch (error) {
      this.logger.error('Error getting online users for ride:', error);
      return 0;
    }
  }

  /**
   * Validate ride exists and is active
   */
  async isRideActive(rideId: string): Promise<boolean> {
    try {
      const ride = await this.rideModel.findById(rideId).exec();
      if (!ride) {
        return false;
      }

      const activeStatuses = ['pending', 'accepted', 'in_progress'];
      return activeStatuses.includes(ride.status);
    } catch (error) {
      this.logger.error('Error checking ride status:', error);
      return false;
    }
  }

  /**
   * Save ride message to database
   */
  async saveRideMessage(messageData: {
    rideId: string;
    senderId: string;
    message: string;
    messageType?: string;
    fileUrl?: string;
    fileName?: string;
  }): Promise<any> {
    try {
      const rideMessage = new this.rideMessageModel({
        messageId: require('crypto').randomUUID(),
        rideId: messageData.rideId,
        senderId: messageData.senderId,
        message: messageData.message,
        messageType: messageData.messageType || 'text',
        fileUrl: messageData.fileUrl,
        fileName: messageData.fileName,
      });

      const savedMessage = await rideMessage.save();
      this.logger.log(`Ride message saved for ride ${messageData.rideId}`);
      
      return savedMessage;
    } catch (error) {
      this.logger.error('Error saving ride message:', error);
      throw error;
    }
  }
}
