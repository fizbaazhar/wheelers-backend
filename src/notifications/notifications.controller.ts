import { Body, Controller, Get, Post, Query, Request, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { NotificationsService } from './notifications.service';
import type { CreateNotificationDto } from './dto/create-notification.dto';

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  async getUserNotifications(
    @Request() req,
    @Query('limit') limit?: string,
    @Query('skip') skip?: string,
  ) {
    const limitNum = limit ? parseInt(limit, 10) : 50;
    const skipNum = skip ? parseInt(skip, 10) : 0;
    
    const notifications = await this.notificationsService.getUserNotifications(
      req.user.userId,
      limitNum,
      skipNum,
    );
    
    const unreadCount = await this.notificationsService.getUnreadCount(req.user.userId);
    
    return {
      message: 'User notifications retrieved',
      notifications,
      unreadCount,
      total: notifications.length,
    };
  }

  @Post()
  async createNotification(@Body() body: CreateNotificationDto) {
    const notification = await this.notificationsService.create(body);
    return {
      message: 'Notification created successfully',
      notification,
    };
  }
}
