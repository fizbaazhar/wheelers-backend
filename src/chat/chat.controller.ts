import { 
  Controller, 
  Post, 
  Get, 
  Body, 
  Param, 
  Query, 
  UseGuards, 
  Logger,
  Request,
  Inject,
  forwardRef
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ChatService } from './chat.service';
import { CreateThreadDto } from './dto/create-thread.dto';
import { SendMessageDto } from './dto/send-message.dto';
import { MarkMessagesReadDto } from './dto/mark-read.dto';
import { SendRideMessageDto } from './dto/send-ride-message.dto';
import { WebsocketsGateway } from '../websockets/websockets.gateway';

@Controller('chat')
@UseGuards(JwtAuthGuard)
export class ChatController {
  private readonly logger = new Logger(ChatController.name);

  constructor(
    private readonly chatService: ChatService,
    @Inject(forwardRef(() => WebsocketsGateway))
    private readonly websocketsGateway: WebsocketsGateway
  ) {}

  @Post('thread')
  async createThread(@Body() createThreadDto: CreateThreadDto, @Request() req) {
    try {
      const userId = req.user?.id || req.user?.userId;
      this.logger.log(`Creating chat thread for user ${userId}`);
      
      const thread = await this.chatService.createThread(createThreadDto);
      
      return {
        success: true,
        message: 'Chat thread created successfully',
        data: thread
      };
    } catch (error) {
      this.logger.error('Error creating chat thread:', error);
      return {
        success: false,
        message: 'Failed to create chat thread',
        error: error.message
      };
    }
  }

  @Post('message')
  async sendMessage(@Body() sendMessageDto: SendMessageDto, @Request() req) {
    try {
      const userId = req.user?.id || req.user?.userId;
      const userType = await this.chatService.getUserTypeInThread(sendMessageDto.threadId, userId);
      
      if (!userType) {
        return {
          success: false,
          message: 'User not authorized for this thread'
        };
      }

      const message = await this.chatService.sendMessage(sendMessageDto, userId, userType);
      
      return {
        success: true,
        message: 'Message sent successfully',
        data: message
      };
    } catch (error) {
      this.logger.error('Error sending message:', error);
      return {
        success: false,
        message: 'Failed to send message',
        error: error.message
      };
    }
  }

  @Get('thread/:threadId/messages')
  async getThreadMessages(
    @Param('threadId') threadId: string,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '50',
    @Request() req
  ) {
    try {
      const userId = req.user?.id || req.user?.userId;
      const userType = await this.chatService.getUserTypeInThread(threadId, userId);
      
      if (!userType) {
        return {
          success: false,
          message: 'User not authorized for this thread'
        };
      }

      const result = await this.chatService.getThreadMessages(
        threadId, 
        parseInt(page), 
        parseInt(limit)
      );
      
      return {
        success: true,
        data: result
      };
    } catch (error) {
      this.logger.error('Error getting thread messages:', error);
      return {
        success: false,
        message: 'Failed to get messages',
        error: error.message
      };
    }
  }

  @Get('threads')
  async getUserThreads(
    @Query('type') type: 'user' | 'driver' = 'user',
    @Request() req
  ) {
    try {
      const userId = req.user?.id || req.user?.userId;
      const threads = await this.chatService.getUserThreads(userId, type);
      
      return {
        success: true,
        data: threads
      };
    } catch (error) {
      this.logger.error('Error getting user threads:', error);
      return {
        success: false,
        message: 'Failed to get threads',
        error: error.message
      };
    }
  }

  @Get('thread/:threadId')
  async getThread(@Param('threadId') threadId: string, @Request() req) {
    try {
      const userId = req.user?.id || req.user?.userId;
      const userType = await this.chatService.getUserTypeInThread(threadId, userId);
      
      if (!userType) {
        return {
          success: false,
          message: 'User not authorized for this thread'
        };
      }

      const thread = await this.chatService.getThreadById(threadId);
      
      return {
        success: true,
        data: thread
      };
    } catch (error) {
      this.logger.error('Error getting thread:', error);
      return {
        success: false,
        message: 'Failed to get thread',
        error: error.message
      };
    }
  }

  @Get('thread/ride-request/:rideRequestId')
  async getThreadByRideRequest(@Param('rideRequestId') rideRequestId: string, @Request() req) {
    try {
      const userId = req.user?.id || req.user?.userId;
      const thread = await this.chatService.getThreadByRideRequest(rideRequestId);
      
      if (!thread) {
        return {
          success: false,
          message: 'No chat thread found for this ride request'
        };
      }

      // Check if user is part of this thread
      const userType = await this.chatService.getUserTypeInThread(thread.threadId, userId);
      if (!userType) {
        return {
          success: false,
          message: 'User not authorized for this thread'
        };
      }
      
      return {
        success: true,
        data: thread
      };
    } catch (error) {
      this.logger.error('Error getting thread by ride request:', error);
      return {
        success: false,
        message: 'Failed to get thread',
        error: error.message
      };
    }
  }

  @Post('messages/read')
  async markMessagesAsRead(@Body() markReadDto: MarkMessagesReadDto, @Request() req) {
    try {
      const userId = req.user?.id || req.user?.userId;
      const userType = await this.chatService.getUserTypeInThread(markReadDto.threadId, userId);
      
      if (!userType) {
        return {
          success: false,
          message: 'User not authorized for this thread'
        };
      }

      await this.chatService.markMessagesAsRead(
        markReadDto.threadId, 
        markReadDto.messageIds, 
        userId
      );
      
      return {
        success: true,
        message: 'Messages marked as read'
      };
    } catch (error) {
      this.logger.error('Error marking messages as read:', error);
      return {
        success: false,
        message: 'Failed to mark messages as read',
        error: error.message
      };
    }
  }

  @Post('thread/:threadId/close')
  async closeThread(@Param('threadId') threadId: string, @Request() req) {
    try {
      const userId = req.user?.id || req.user?.userId;
      const userType = await this.chatService.getUserTypeInThread(threadId, userId);
      
      if (!userType) {
        return {
          success: false,
          message: 'User not authorized for this thread'
        };
      }

      await this.chatService.closeThread(threadId);
      
      return {
        success: true,
        message: 'Thread closed successfully'
      };
    } catch (error) {
      this.logger.error('Error closing thread:', error);
      return {
        success: false,
        message: 'Failed to close thread',
        error: error.message
      };
    }
  }

  @Post('message/:messageId/delete')
  async deleteMessage(@Param('messageId') messageId: string, @Request() req) {
    try {
      const userId = req.user?.id || req.user?.userId;
      await this.chatService.deleteMessage(messageId, userId);
      
      return {
        success: true,
        message: 'Message deleted successfully'
      };
    } catch (error) {
      this.logger.error('Error deleting message:', error);
      return {
        success: false,
        message: 'Failed to delete message',
        error: error.message
      };
    }
  }

  // ===== RIDE-BASED CHAT ENDPOINTS =====
  @Post('ride/message')
  async sendRideMessage(@Body() sendRideMessageDto: SendRideMessageDto, @Request() req) {
    try {
      const userId = req.user?.id || req.user?.userId;
      
      // Validate user is part of this ride
      const isValidUser = await this.chatService.validateUserInRide(sendRideMessageDto.rideId, userId);
      if (!isValidUser) {
        return {
          success: false,
          message: 'User not authorized for this ride'
        };
      }

      const message = await this.chatService.sendRideMessage(sendRideMessageDto, userId);
      
      const messageData = message.toObject ? message.toObject() : message;
      this.websocketsGateway.broadcastRideMessage(sendRideMessageDto.rideId, messageData);
      
      return {
        success: true,
        message: 'Ride message sent successfully',
        data: message
      };
    } catch (error) {
      this.logger.error('Error sending ride message:', error);
      return {
        success: false,
        message: 'Failed to send ride message',
        error: error.message
      };
    }
  }

  @Get('ride/:rideId/messages')
  async getRideMessages(
    @Param('rideId') rideId: string,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '50',
    @Request() req
  ) {
    try {
      const userId = req.user?.id || req.user?.userId;
      
      // Validate user is part of this ride
      const isValidUser = await this.chatService.validateUserInRide(rideId, userId);
      if (!isValidUser) {
        return {
          success: false,
          message: 'User not authorized for this ride'
        };
      }

      const result = await this.chatService.getRideMessages(
        rideId, 
        parseInt(page), 
        parseInt(limit)
      );
      
      return {
        success: true,
        data: result
      };
    } catch (error) {
      this.logger.error('Error getting ride messages:', error);
      return {
        success: false,
        message: 'Failed to get ride messages',
        error: error.message
      };
    }
  }
}
