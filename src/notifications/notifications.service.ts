import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Notification, NotificationType, NotificationPriority } from '../models/notification.schema';
import { CreateNotificationDto } from './dto/create-notification.dto';

@Injectable()
export class NotificationsService {
  constructor(
    @InjectModel(Notification.name) private readonly notificationModel: Model<Notification>,
  ) {}

  async create(dto: CreateNotificationDto): Promise<Notification> {
    if (!dto.userId || !dto.title || !dto.message) {
      throw new BadRequestException('userId, title, and message are required');
    }

    const notification = new this.notificationModel({
      userId: new Types.ObjectId(dto.userId),
      title: dto.title,
      message: dto.message,
      type: dto.type || NotificationType.GENERAL,
      priority: dto.priority || NotificationPriority.MEDIUM,
      actionUrl: dto.actionUrl,
      actionText: dto.actionText,
      imageUrl: dto.imageUrl,
      metadata: dto.metadata || {},
      isRead: false,
      isPushSent: false,
      isEmailSent: false,
      isSMSSent: false,
    });

    return notification.save();
  }

  async getUserNotifications(userId: string, limit: number = 50, skip: number = 0): Promise<Notification[]> {
    return this.notificationModel
      .find({ userId: new Types.ObjectId(userId) })
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(skip)
      .exec();
  }

  async getUnreadCount(userId: string): Promise<number> {
    return this.notificationModel
      .countDocuments({ userId: new Types.ObjectId(userId), isRead: false })
      .exec();
  }
}
