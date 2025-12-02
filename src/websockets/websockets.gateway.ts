import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { WebsocketsService } from './websockets.service';
import { ChatMessageDto, JoinRideDto, LeaveRideDto } from './dto/chat-message.dto';
import { RideUpdateDto, LocationUpdateDto } from './dto/ride-update.dto';
import { NotificationDto } from './dto/notification.dto';
import { DriverConnectionDto, CreateRideRequestDto } from './dto/ride-request.dto';
import { DriverBidDto } from './dto/driver-bid.dto';
import { ChatService } from '../chat/chat.service';
import { VehicleDetailsService } from '../vehicle-details/vehicle-details.service';
import { VehicleType } from '../common/enums/vehicle-type.enum';

@WebSocketGateway({
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
    credentials: true,
  },
  namespace: '/wheelers',
  transports: ['websocket', 'polling'],
  allowEIO3: true,
})
export class WebsocketsGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(WebsocketsGateway.name);
  private connectedUsers = new Map<string, string>(); // socketId -> userId
  private userSockets = new Map<string, string>(); // userId -> socketId
  private rideRooms = new Map<string, Set<string>>(); // rideId -> Set of userIds
  private connectedDrivers = new Map<string, string>(); // socketId -> driverId
  private driverSockets = new Map<string, string>(); // driverId -> socketId

  constructor(
    private readonly websocketsService: WebsocketsService,
    private readonly chatService: ChatService,
    private readonly vehicleDetailsService: VehicleDetailsService,
  ) {}

  afterInit(server: Server) {
    this.logger.log('WebSocket Gateway initialized');
  }

  async handleConnection(client: Socket) {
    try {
      // Extract user ID from JWT token in handshake - try multiple methods
      let token = client.handshake.auth?.token || 
                  client.handshake.headers?.authorization?.replace('Bearer ', '');
      
      // Check query parameters (handle both string and string[] types)
      if (!token && client.handshake.query) {
        const queryToken = client.handshake.query.token;
        const queryAuth = client.handshake.query.authorization;
        
        if (queryToken) {
          token = Array.isArray(queryToken) ? queryToken[0] : queryToken;
        } else if (queryAuth) {
          const authValue = Array.isArray(queryAuth) ? queryAuth[0] : queryAuth;
          token = authValue.replace('Bearer ', '');
        }
      }
      
      this.logger.log(`Client ${client.id} connection attempt with token: ${token ? 'present' : 'missing'}`);
      
      // For development/testing purposes, allow connection without token
      if (!token) {
        if (process.env.ENV === 'dev' || process.env.ALLOW_WS_WITHOUT_AUTH === 'true') {
          this.logger.warn(`Client ${client.id} connected without token in development mode`);
          const testUserId = 'test-user-' + client.id;
          this.connectedUsers.set(client.id, testUserId);
          this.userSockets.set(testUserId, client.id);
          
          await client.join(`user_${testUserId}`);
          
          this.logger.log(`Test user ${testUserId} connected with socket ${client.id}`);
          
          client.emit('connected', { 
            message: 'Successfully connected to Wheelers WebSocket (Development Mode)',
            userId: testUserId,
            timestamp: new Date().toISOString()
          });
          return;
        } else {
          this.logger.warn(`Client ${client.id} connected without token`);
          client.disconnect();
          return;
        }
      }

      // Verify JWT token and extract user ID
      const userId = await this.websocketsService.verifyTokenAndGetUserId(token);
      
      if (!userId) {
        this.logger.warn(`Invalid token for client ${client.id}`);
        client.disconnect();
        return;
      }

      // Store user connection
      this.connectedUsers.set(client.id, userId);
      this.userSockets.set(userId, client.id);
      
      // Join user to their personal room
      await client.join(`user_${userId}`);
      
      this.logger.log(`User ${userId} connected with socket ${client.id}`);
      
      // Notify user of successful connection
      client.emit('connected', { 
        message: 'Successfully connected to Wheelers WebSocket',
        userId,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      this.logger.error(`Connection error for client ${client.id}:`, error);
      client.disconnect();
    }
  }

  async handleDisconnect(client: Socket) {
    const userId = this.connectedUsers.get(client.id);
    const driverId = this.connectedDrivers.get(client.id);
    
    if (userId) {
      this.connectedUsers.delete(client.id);
      this.userSockets.delete(userId);
      
      // Remove user from all ride rooms
      for (const [rideId, users] of this.rideRooms.entries()) {
        users.delete(userId);
        if (users.size === 0) {
          this.rideRooms.delete(rideId);
        }
      }
      
      this.logger.log(`User ${userId} disconnected`);
    }

    if (driverId) {
      this.connectedDrivers.delete(client.id);
      this.driverSockets.delete(driverId);
      this.logger.log(`Driver ${driverId} disconnected`);
    }
  }

  @SubscribeMessage('join_ride')
  async handleJoinRide(
    @MessageBody() data: JoinRideDto,
    @ConnectedSocket() client: Socket,
  ) {
    try {
      let userId = this.connectedUsers.get(client.id);
      const driverId = this.connectedDrivers.get(client.id);
      
      if (driverId && !userId) {
        userId = driverId;
        this.connectedUsers.set(client.id, driverId);
        if (!this.userSockets.has(driverId)) {
          this.userSockets.set(driverId, client.id);
        }
      }
      
      if (!userId) {
        client.emit('error', { message: 'User not authenticated' });
        return;
      }

      // Validate that user is part of this ride
      const isValidUser = await this.websocketsService.validateUserInRide(data.rideId, userId);
      if (!isValidUser) {
        client.emit('error', { message: 'User not authorized for this ride' });
        return;
      }

      // Join ride room
      await client.join(`ride_${data.rideId}`);
      
      // Add user to ride room tracking
      if (!this.rideRooms.has(data.rideId)) {
        this.rideRooms.set(data.rideId, new Set());
      }
      this.rideRooms.get(data.rideId)!.add(userId);

      this.logger.log(`User ${userId} joined ride ${data.rideId}`);
      
      // Notify other users in the ride
      client.to(`ride_${data.rideId}`).emit('user_joined_ride', {
        userId,
        rideId: data.rideId,
        timestamp: new Date().toISOString()
      });

      client.emit('joined_ride', { 
        rideId: data.rideId,
        message: 'Successfully joined ride chat'
      });

    } catch (error) {
      this.logger.error('Error joining ride:', error);
      client.emit('error', { message: 'Failed to join ride' });
    }
  }

  @SubscribeMessage('leave_ride')
  async handleLeaveRide(
    @MessageBody() data: LeaveRideDto,
    @ConnectedSocket() client: Socket,
  ) {
    try {
      const userId = this.connectedUsers.get(client.id);
      if (!userId) {
        client.emit('error', { message: 'User not authenticated' });
        return;
      }

      // Leave ride room
      await client.leave(`ride_${data.rideId}`);
      
      // Remove user from ride room tracking
      const rideUsers = this.rideRooms.get(data.rideId);
      if (rideUsers) {
        rideUsers.delete(userId);
        if (rideUsers.size === 0) {
          this.rideRooms.delete(data.rideId);
        }
      }

      this.logger.log(`User ${userId} left ride ${data.rideId}`);
      
      // Notify other users in the ride
      client.to(`ride_${data.rideId}`).emit('user_left_ride', {
        userId,
        rideId: data.rideId,
        timestamp: new Date().toISOString()
      });

      client.emit('left_ride', { 
        rideId: data.rideId,
        message: 'Successfully left ride chat'
      });

    } catch (error) {
      this.logger.error('Error leaving ride:', error);
      client.emit('error', { message: 'Failed to leave ride' });
    }
  }

  @SubscribeMessage('send_message')
  async handleSendMessage(
    @MessageBody() data: ChatMessageDto,
    @ConnectedSocket() client: Socket,
  ) {
    try {
      let userId = this.connectedUsers.get(client.id);
      const driverId = this.connectedDrivers.get(client.id);
      
      if (driverId && !userId) {
        userId = driverId;
        this.connectedUsers.set(client.id, driverId);
        if (!this.userSockets.has(driverId)) {
          this.userSockets.set(driverId, client.id);
        }
      }
      
      if (!userId) {
        client.emit('error', { message: 'User not authenticated' });
        return;
      }

      // Validate that user is part of this ride
      const isValidUser = await this.websocketsService.validateUserInRide(data.rideId, userId);
      if (!isValidUser) {
        client.emit('error', { message: 'User not authorized for this ride' });
        return;
      }

      // Save message to database
      const savedMessage = await this.websocketsService.saveChatMessage({
        ...data,
        senderId: userId,
        timestamp: new Date().toISOString()
      });

      // Broadcast message to all users in the ride
      this.server.to(`ride_${data.rideId}`).emit('new_message', savedMessage);

      this.logger.log(`Message sent in ride ${data.rideId} by user ${userId}`);

    } catch (error) {
      this.logger.error('Error sending message:', error);
      client.emit('error', { message: 'Failed to send message' });
    }
  }

  @SubscribeMessage('update_location')
  async handleLocationUpdate(
    @MessageBody() data: LocationUpdateDto,
    @ConnectedSocket() client: Socket,
  ) {
    try {
      let userId = this.connectedUsers.get(client.id);
      const driverId = this.connectedDrivers.get(client.id);
      
      if (driverId && !userId) {
        userId = driverId;
        this.connectedUsers.set(client.id, driverId);
        if (!this.userSockets.has(driverId)) {
          this.userSockets.set(driverId, client.id);
        }
      }
      
      if (!userId) {
        client.emit('error', { message: 'User not authenticated' });
        return;
      }

      // Validate that user is part of this ride
      const isValidUser = await this.websocketsService.validateUserInRide(data.rideId, userId);
      if (!isValidUser) {
        client.emit('error', { message: 'User not authorized for this ride' });
        return;
      }

      // Update location in database
      await this.websocketsService.updateUserLocation({
        ...data,
        userId
      });

      // Broadcast location update to other users in the ride
      client.to(`ride_${data.rideId}`).emit('location_updated', {
        userId,
        rideId: data.rideId,
        latitude: data.latitude,
        longitude: data.longitude,
        accuracy: data.accuracy,
        speed: data.speed,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      this.logger.error('Error updating location:', error);
      client.emit('error', { message: 'Failed to update location' });
    }
  }

  // Method to send ride updates (called by other services)
  async sendRideUpdate(rideId: string, update: RideUpdateDto) {
    this.server.to(`ride_${rideId}`).emit('ride_updated', {
      ...update,
      timestamp: new Date().toISOString()
    });
  }

  // Method to send notifications to specific users
  async sendNotification(userId: string, notification: NotificationDto) {
    this.server.to(`user_${userId}`).emit('notification', {
      ...notification,
      timestamp: new Date().toISOString()
    });
  }

  // Method to broadcast to all connected users
  async broadcastToAll(event: string, data: any) {
    this.server.emit(event, data);
  }

  // Get connected users count
  getConnectedUsersCount(): number {
    return this.connectedUsers.size;
  }

  // Get users in a specific ride
  getUsersInRide(rideId: string): string[] {
    const users = this.rideRooms.get(rideId);
    return users ? Array.from(users) : [];
  }

  @SubscribeMessage('driver_connect')
  async handleDriverConnect(
    @MessageBody() data: DriverConnectionDto,
    @ConnectedSocket() client: Socket,
  ) {
    try {
      const driverId = data.driverId;
      if (!driverId) {
        client.emit('error', { message: 'Driver ID is required' });
        this.logger.error('Driver connection failed: No driverId provided');
        return;
      }

      // Store driver connection
      this.connectedDrivers.set(client.id, driverId);
      this.driverSockets.set(driverId, client.id);
      
      this.connectedUsers.set(client.id, driverId);
      
      await client.join('drivers');
      this.logger.log(`Driver ${driverId} joined general 'drivers' room`);

      try {
        const vehicles = await this.vehicleDetailsService.getUserVehicles(driverId);
        if (vehicles && vehicles.length > 0) {
          this.logger.log(`Driver ${driverId} has ${vehicles.length} vehicle(s)`);
          for (const vehicle of vehicles) {
            if (vehicle.category) {
              const normalizedCategory = vehicle.category.toString().toLowerCase().replace(/\s+/g, '_');
              const roomName = `drivers_${normalizedCategory}`;
              await client.join(roomName);
              this.logger.log(`Driver ${driverId} joined room ${roomName} (vehicle category: ${vehicle.category})`);
            } else {
              this.logger.warn(`Vehicle ${vehicle._id} for driver ${driverId} has no category`);
            }
          }
        } else {
          this.logger.warn(`Driver ${driverId} has no vehicles registered`);
        }
      } catch (err) {
        this.logger.error(`Failed to fetch vehicle details for driver ${driverId}:`, err);
      }
      
      this.logger.log(`Driver ${driverId} connected with socket ${client.id}`);
      
      // Notify driver of successful connection
      client.emit('driver_connected', { 
        message: 'Successfully connected as driver',
        driverId,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      this.logger.error('Error in driver connection:', error);
      client.emit('error', { message: 'Failed to connect as driver' });
    }
  }

  // Method to broadcast ride request to all connected drivers
  async broadcastRideRequest(rideRequest: CreateRideRequestDto) {
    if (rideRequest.vehicleType) {
      const normalizedVehicleType = rideRequest.vehicleType.toString().toLowerCase().replace(/\s+/g, '_');
      const roomName = `drivers_${normalizedVehicleType}`;
      
      this.logger.log(`Broadcasting ride request to room: ${roomName} (vehicleType: ${rideRequest.vehicleType})`);
      
      let driverCount = 0;
      try {
        const adapter = this.server.sockets?.adapter;
        if (adapter && adapter.rooms) {
          const room = adapter.rooms.get(roomName);
          driverCount = room ? room.size : 0;
        }
      } catch (err) {
        this.logger.warn('Could not access socket adapter to count drivers in room');
      }
      
      this.server.to(roomName).emit('new_ride_request', {
        ...rideRequest,
        timestamp: new Date().toISOString()
      });
      
      this.logger.log(`Ride request broadcasted to room ${roomName}${driverCount > 0 ? ` (${driverCount} driver(s) in room)` : ''}`);
      
      try {
        const adapter = this.server.sockets?.adapter;
        if (adapter && adapter.rooms) {
          const allRooms = Array.from(adapter.rooms.keys()).filter(room => room.startsWith('drivers_'));
          if (allRooms.length > 0) {
            this.logger.log(`Available driver rooms: ${allRooms.join(', ')}`);
          }
        }
      } catch (err) {
      }
    } else {
      this.server.to('drivers').emit('new_ride_request', {
        ...rideRequest,
        timestamp: new Date().toISOString()
      });
      this.logger.log(`Ride request broadcasted to all drivers (no vehicle type specified)`);
    }
  }

  // Get connected drivers count
  getConnectedDriversCount(): number {
    return this.connectedDrivers.size;
  }

  // Get all connected driver IDs
  getConnectedDriverIds(): string[] {
    return Array.from(this.driverSockets.keys());
  }

  @SubscribeMessage('join_ride_request')
  async handleJoinRideRequest(
    @MessageBody() data: { rideRequestId: string },
    @ConnectedSocket() client: Socket,
  ) {
    try {
      const userId = this.connectedUsers.get(client.id);
      if (!userId) {
        client.emit('error', { message: 'User not authenticated' });
        return;
      }

      // Join the ride request room to receive bids
      await client.join(`ride_request_${data.rideRequestId}`);
      
      this.logger.log(`User ${userId} joined ride request ${data.rideRequestId} for bids`);
      
      client.emit('joined_ride_request', { 
        rideRequestId: data.rideRequestId,
        message: 'Successfully joined ride request for receiving bids'
      });

    } catch (error) {
      this.logger.error('Error joining ride request:', error);
      client.emit('error', { message: 'Failed to join ride request' });
    }
  }

  @SubscribeMessage('leave_ride_request')
  async handleLeaveRideRequest(
    @MessageBody() data: { rideRequestId: string },
    @ConnectedSocket() client: Socket,
  ) {
    try {
      const userId = this.connectedUsers.get(client.id);
      if (!userId) {
        client.emit('error', { message: 'User not authenticated' });
        return;
      }

      // Leave the ride request room
      await client.leave(`ride_request_${data.rideRequestId}`);
      
      this.logger.log(`User ${userId} left ride request ${data.rideRequestId}`);
      
      client.emit('left_ride_request', { 
        rideRequestId: data.rideRequestId,
        message: 'Successfully left ride request'
      });

    } catch (error) {
      this.logger.error('Error leaving ride request:', error);
      client.emit('error', { message: 'Failed to leave ride request' });
    }
  }
  
  async broadcastDriverBid(rideRequestId: string, bid: DriverBidDto | any) {
    this.server.to(`ride_request_${rideRequestId}`).emit('driver_bid_received', {
      ...bid,
      timestamp: new Date().toISOString()
    });
    
    this.logger.log(`Driver bid broadcasted for ride request ${rideRequestId} from driver ${bid.driverId}`);
  }

  // ===== CHAT WEBSOCKET HANDLERS =====

  @SubscribeMessage('join_chat_thread')
  async handleJoinChatThread(
    @MessageBody() data: { threadId: string },
    @ConnectedSocket() client: Socket,
  ) {
    try {
      const userId = this.connectedUsers.get(client.id);
      if (!userId) {
        client.emit('error', { message: 'User not authenticated' });
        return;
      }

      // Verify user is part of this thread
      const userType = await this.chatService.getUserTypeInThread(data.threadId, userId);
      if (!userType) {
        client.emit('error', { message: 'User not authorized for this chat thread' });
        return;
      }

      // Join chat thread room
      await client.join(`chat_thread_${data.threadId}`);
      
      this.logger.log(`User ${userId} joined chat thread ${data.threadId}`);
      
      client.emit('joined_chat_thread', { 
        threadId: data.threadId,
        message: 'Successfully joined chat thread'
      });

    } catch (error) {
      this.logger.error('Error joining chat thread:', error);
      client.emit('error', { message: 'Failed to join chat thread' });
    }
  }

  @SubscribeMessage('leave_chat_thread')
  async handleLeaveChatThread(
    @MessageBody() data: { threadId: string },
    @ConnectedSocket() client: Socket,
  ) {
    try {
      const userId = this.connectedUsers.get(client.id);
      if (!userId) {
        client.emit('error', { message: 'User not authenticated' });
        return;
      }

      // Leave chat thread room
      await client.leave(`chat_thread_${data.threadId}`);
      
      this.logger.log(`User ${userId} left chat thread ${data.threadId}`);
      
      client.emit('left_chat_thread', { 
        threadId: data.threadId,
        message: 'Successfully left chat thread'
      });

    } catch (error) {
      this.logger.error('Error leaving chat thread:', error);
      client.emit('error', { message: 'Failed to leave chat thread' });
    }
  }

  @SubscribeMessage('send_chat_message')
  async handleSendChatMessage(
    @MessageBody() data: {
      threadId: string;
      message: string;
      messageType?: string;
      fileUrl?: string;
      fileName?: string;
      replyToMessageId?: string;
    },
    @ConnectedSocket() client: Socket,
  ) {
    try {
      const userId = this.connectedUsers.get(client.id);
      if (!userId) {
        client.emit('error', { message: 'User not authenticated' });
        return;
      }

      // Verify user is part of this thread
      const userType = await this.chatService.getUserTypeInThread(data.threadId, userId);
      if (!userType) {
        client.emit('error', { message: 'User not authorized for this chat thread' });
        return;
      }

      // Save message to database
      const savedMessage = await this.chatService.sendMessage({
        threadId: data.threadId,
        message: data.message,
        messageType: data.messageType as any || 'text',
        fileUrl: data.fileUrl,
        fileName: data.fileName,
        replyToMessageId: data.replyToMessageId,
      }, userId, userType);

      // Broadcast message to all users in the chat thread
      this.server.to(`chat_thread_${data.threadId}`).emit('new_chat_message', {
        ...savedMessage.toObject(),
        timestamp: new Date().toISOString()
      });

      this.logger.log(`Chat message sent in thread ${data.threadId} by ${userType} ${userId}`);

    } catch (error) {
      this.logger.error('Error sending chat message:', error);
      client.emit('error', { message: 'Failed to send chat message' });
    }
  }

  @SubscribeMessage('mark_messages_read')
  async handleMarkMessagesRead(
    @MessageBody() data: { threadId: string; messageIds: string[] },
    @ConnectedSocket() client: Socket,
  ) {
    try {
      const userId = this.connectedUsers.get(client.id);
      if (!userId) {
        client.emit('error', { message: 'User not authenticated' });
        return;
      }

      // Mark messages as read
      await this.chatService.markMessagesAsRead(data.threadId, data.messageIds, userId);

      // Notify other users in the thread that messages were read
      client.to(`chat_thread_${data.threadId}`).emit('messages_read', {
        threadId: data.threadId,
        messageIds: data.messageIds,
        readBy: userId,
        timestamp: new Date().toISOString()
      });

      this.logger.log(`Messages marked as read in thread ${data.threadId} by user ${userId}`);

    } catch (error) {
      this.logger.error('Error marking messages as read:', error);
      client.emit('error', { message: 'Failed to mark messages as read' });
    }
  }

  // Method to broadcast chat message to specific thread
  async broadcastChatMessage(threadId: string, message: any) {
    this.server.to(`chat_thread_${threadId}`).emit('new_chat_message', {
      ...message,
      timestamp: new Date().toISOString()
    });
    
    this.logger.log(`Chat message broadcasted to thread ${threadId}`);
  }

  // Method to get users in a chat thread
  getUsersInChatThread(threadId: string): string[] {
    const room = this.server.sockets.adapter.rooms.get(`chat_thread_${threadId}`);
    return room ? Array.from(room) : [];
  }

  // ===== RIDE-BASED CHAT WEBSOCKET HANDLERS =====

  @SubscribeMessage('join_ride_chat')
  async handleJoinRideChat(
    @MessageBody() data: { rideId: string },
    @ConnectedSocket() client: Socket,
  ) {
    try {
      let userId = this.connectedUsers.get(client.id);
      const driverId = this.connectedDrivers.get(client.id);
      
      if (driverId && !userId) {
        userId = driverId;
        this.connectedUsers.set(client.id, driverId);
        if (!this.userSockets.has(driverId)) {
          this.userSockets.set(driverId, client.id);
        }
      }
      
      if (!userId) {
        client.emit('error', { message: 'User not authenticated' });
        return;
      }

      const isValidUser = await this.websocketsService.validateUserInRide(data.rideId, userId);
      if (!isValidUser) {
        client.emit('error', { message: 'User not authorized for this ride' });
        return;
      }

      await client.join(`ride_chat_${data.rideId}`);
      client.emit('joined_ride_chat', { rideId: data.rideId });

    } catch (error) {
      this.logger.error('Error joining ride chat:', error);
      client.emit('error', { message: 'Failed to join ride chat' });
    }
  }

  @SubscribeMessage('leave_ride_chat')
  async handleLeaveRideChat(
    @MessageBody() data: { rideId: string },
    @ConnectedSocket() client: Socket,
  ) {
    try {
      const userId = this.connectedUsers.get(client.id);
      if (!userId) {
        client.emit('error', { message: 'User not authenticated' });
        return;
      }

      // Leave ride chat room
      await client.leave(`ride_chat_${data.rideId}`);
      
      this.logger.log(`User ${userId} left ride chat ${data.rideId}`);
      
      client.emit('left_ride_chat', { 
        rideId: data.rideId,
        message: 'Successfully left ride chat'
      });

    } catch (error) {
      this.logger.error('Error leaving ride chat:', error);
      client.emit('error', { message: 'Failed to leave ride chat' });
    }
  }

  @SubscribeMessage('send_ride_message')
  async handleSendRideMessage(
    @MessageBody() data: {
      rideId: string;
      message: string;
      messageType?: string;
      fileUrl?: string;
      fileName?: string;
    },
    @ConnectedSocket() client: Socket,
  ) {
    try {
      let userId = this.connectedUsers.get(client.id);
      const driverId = this.connectedDrivers.get(client.id);
      
      if (driverId && !userId) {
        userId = driverId;
        this.connectedUsers.set(client.id, driverId);
        if (!this.userSockets.has(driverId)) {
          this.userSockets.set(driverId, client.id);
        }
      }
      
      if (!userId) {
        client.emit('error', { message: 'User not authenticated' });
        return;
      }

      const isValidUser = await this.websocketsService.validateUserInRide(data.rideId, userId);
      if (!isValidUser) {
        client.emit('error', { message: 'User not authorized for this ride' });
        return;
      }

      const savedMessage = await this.websocketsService.saveRideMessage({
        rideId: data.rideId,
        senderId: userId,
        message: data.message,
        messageType: data.messageType || 'text',
        fileUrl: data.fileUrl,
        fileName: data.fileName,
      });

      const messageToSend = savedMessage.toObject ? savedMessage.toObject() : savedMessage;
      this.server.to(`ride_chat_${data.rideId}`).emit('new_ride_message', {
        messageId: messageToSend.messageId || messageToSend._id?.toString(),
        rideId: messageToSend.rideId,
        senderId: messageToSend.senderId,
        senderName: messageToSend.senderName || '',
        message: messageToSend.message,
        messageType: messageToSend.messageType || 'text',
        timestamp: messageToSend.timestamp || messageToSend.createdAt || new Date().toISOString(),
        createdAt: messageToSend.createdAt,
      });

    } catch (error) {
      this.logger.error('Error sending ride message:', error);
      client.emit('error', { message: 'Failed to send ride message' });
    }
  }

  async broadcastRideMessage(rideId: string, message: any) {
    const messageToSend = message.toObject ? message.toObject() : message;
    this.server.to(`ride_chat_${rideId}`).emit('new_ride_message', {
      messageId: messageToSend.messageId || messageToSend._id?.toString(),
      rideId: messageToSend.rideId,
      senderId: messageToSend.senderId,
      senderName: messageToSend.senderName || '',
      message: messageToSend.message,
      messageType: messageToSend.messageType || 'text',
      timestamp: messageToSend.timestamp || messageToSend.createdAt || new Date().toISOString(),
      createdAt: messageToSend.createdAt,
    });
  }

  // Method to get users in a ride chat
  getUsersInRideChat(rideId: string): string[] {
    const room = this.server.sockets.adapter.rooms.get(`ride_chat_${rideId}`);
    return room ? Array.from(room) : [];
  }
}
