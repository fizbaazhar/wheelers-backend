import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ChatThread, ChatThreadDocument } from '../models/chat-thread.schema';
import { ChatMessage, ChatMessageDocument } from '../models/chat-message.schema';
import { RideMessage, RideMessageDocument } from '../models/ride-message.schema';
import { Ride, RideDocument } from '../websockets/schemas/ride.schema';
import { CreateThreadDto } from './dto/create-thread.dto';
import { SendMessageDto } from './dto/send-message.dto';
import { SendRideMessageDto } from './dto/send-ride-message.dto';
import { randomUUID } from 'crypto';

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);

  constructor(
    @InjectModel(ChatThread.name) private chatThreadModel: Model<ChatThreadDocument>,
    @InjectModel(ChatMessage.name) private chatMessageModel: Model<ChatMessageDocument>,
    @InjectModel(RideMessage.name) private rideMessageModel: Model<RideMessageDocument>,
    @InjectModel(Ride.name) private rideModel: Model<RideDocument>,
  ) {}

  async createThread(createThreadDto: CreateThreadDto) {
    try {
      const threadId = randomUUID();
      
      const thread = new this.chatThreadModel({
        threadId,
        rideRequestId: createThreadDto.rideRequestId,
        userId: createThreadDto.userId,
        driverId: createThreadDto.driverId,
        status: 'active',
        isActive: true,
        lastMessageAt: new Date(),
        unreadCountUser: 0,
        unreadCountDriver: 0,
      });

      const savedThread = await thread.save();
      this.logger.log(`Created chat thread ${threadId} for ride request ${createThreadDto.rideRequestId}`);

      // If there's an initial message, send it
      if (createThreadDto.initialMessage) {
        await this.sendMessage({
          threadId,
          message: createThreadDto.initialMessage,
          messageType: 'text' as any,
        }, createThreadDto.userId, 'user');
      }

      return savedThread;
    } catch (error) {
      this.logger.error('Error creating chat thread:', error);
      throw error;
    }
  }

  async sendMessage(sendMessageDto: SendMessageDto, senderId: string, senderType: 'user' | 'driver') {
    try {
      const messageId = randomUUID();
      
      const message = new this.chatMessageModel({
        messageId,
        threadId: sendMessageDto.threadId,
        senderId,
        senderType,
        message: sendMessageDto.message,
        messageType: sendMessageDto.messageType || 'text',
        fileUrl: sendMessageDto.fileUrl,
        fileName: sendMessageDto.fileName,
        isRead: false,
        replyToMessageId: sendMessageDto.replyToMessageId,
      });

      const savedMessage = await message.save();

      // Update thread with latest message info
      await this.chatThreadModel.findOneAndUpdate(
        { threadId: sendMessageDto.threadId },
        {
          lastMessageAt: new Date(),
          lastMessage: sendMessageDto.message,
          lastMessageSenderId: senderId,
          $inc: senderType === 'user' ? { unreadCountDriver: 1 } : { unreadCountUser: 1 }
        }
      );

      this.logger.log(`Message sent in thread ${sendMessageDto.threadId} by ${senderType} ${senderId}`);
      return savedMessage;
    } catch (error) {
      this.logger.error('Error sending message:', error);
      throw error;
    }
  }

  async getThreadMessages(threadId: string, page: number = 1, limit: number = 50) {
    try {
      const skip = (page - 1) * limit;
      
      const messages = await this.chatMessageModel
        .find({ 
          threadId, 
          isDeleted: false 
        })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec();

      const total = await this.chatMessageModel.countDocuments({ 
        threadId, 
        isDeleted: false 
      });

      return {
        messages: messages.reverse(), // Return in chronological order
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      this.logger.error('Error getting thread messages:', error);
      throw error;
    }
  }

  async getThreadById(threadId: string) {
    try {
      return await this.chatThreadModel.findOne({ threadId }).exec();
    } catch (error) {
      this.logger.error('Error getting thread:', error);
      throw error;
    }
  }

  async getThreadByRideRequest(rideRequestId: string) {
    try {
      return await this.chatThreadModel.findOne({ rideRequestId }).exec();
    } catch (error) {
      this.logger.error('Error getting thread by ride request:', error);
      throw error;
    }
  }

  async getUserThreads(userId: string, userType: 'user' | 'driver') {
    try {
      const query = userType === 'user' ? { userId } : { driverId: userId };
      
      const threads = await this.chatThreadModel
        .find(query)
        .sort({ lastMessageAt: -1 })
        .exec();

      return threads;
    } catch (error) {
      this.logger.error('Error getting user threads:', error);
      throw error;
    }
  }

  async markMessagesAsRead(threadId: string, messageIds: string[], userId: string) {
    try {
      await this.chatMessageModel.updateMany(
        { 
          messageId: { $in: messageIds },
          threadId,
          senderId: { $ne: userId } // Don't mark own messages as read
        },
        { 
          isRead: true, 
          readAt: new Date() 
        }
      );

      // Reset unread count for the user
      const userType = await this.getUserTypeInThread(threadId, userId);
      if (userType) {
        await this.chatThreadModel.findOneAndUpdate(
          { threadId },
          { 
            $set: { 
              [`unreadCount${userType === 'user' ? 'User' : 'Driver'}`]: 0 
            } 
          }
        );
      }

      this.logger.log(`Marked ${messageIds.length} messages as read in thread ${threadId}`);
    } catch (error) {
      this.logger.error('Error marking messages as read:', error);
      throw error;
    }
  }

  async getUserTypeInThread(threadId: string, userId: string): Promise<'user' | 'driver' | null> {
    try {
      const thread = await this.chatThreadModel.findOne({ threadId }).exec();
      if (!thread) return null;

      if (thread.userId === userId) return 'user';
      if (thread.driverId === userId) return 'driver';
      return null;
    } catch (error) {
      this.logger.error('Error getting user type in thread:', error);
      return null;
    }
  }

  async closeThread(threadId: string) {
    try {
      await this.chatThreadModel.findOneAndUpdate(
        { threadId },
        { 
          status: 'closed',
          isActive: false 
        }
      );

      this.logger.log(`Thread ${threadId} closed`);
    } catch (error) {
      this.logger.error('Error closing thread:', error);
      throw error;
    }
  }

  async deleteMessage(messageId: string, userId: string) {
    try {
      const message = await this.chatMessageModel.findOne({ messageId }).exec();
      if (!message || message.senderId !== userId) {
        throw new Error('Message not found or not authorized to delete');
      }

      await this.chatMessageModel.findOneAndUpdate(
        { messageId },
        { 
          isDeleted: true,
          deletedAt: new Date(),
          message: '[Message deleted]'
        }
      );

      this.logger.log(`Message ${messageId} deleted by user ${userId}`);
    } catch (error) {
      this.logger.error('Error deleting message:', error);
      throw error;
    }
  }

  // ===== RIDE-BASED CHAT METHODS =====

  async sendRideMessage(sendRideMessageDto: SendRideMessageDto, senderId: string) {
    try {
      const messageId = randomUUID();
      
      const message = new this.rideMessageModel({
        messageId,
        rideId: sendRideMessageDto.rideId,
        senderId,
        message: sendRideMessageDto.message,
        messageType: sendRideMessageDto.messageType || 'text',
      });

      const savedMessage = await message.save();
      this.logger.log(`Ride message sent in ride ${sendRideMessageDto.rideId} by user ${senderId}`);
      return savedMessage;
    } catch (error) {
      this.logger.error('Error sending ride message:', error);
      throw error;
    }
  }

  async getRideMessages(rideId: string, page: number = 1, limit: number = 50) {
    try {
      const skip = (page - 1) * limit;
      
      const messages = await this.rideMessageModel
        .find({ 
          rideId, 
          isDeleted: false 
        })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec();

      const total = await this.rideMessageModel.countDocuments({ 
        rideId, 
        isDeleted: false 
      });

      return {
        messages: messages.reverse(), // Return in chronological order
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      this.logger.error('Error getting ride messages:', error);
      throw error;
    }
  }

  async validateUserInRide(rideId: string, userId: string): Promise<boolean> {
    try {
      if (!rideId || !userId) {
        return false;
      }

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
}
