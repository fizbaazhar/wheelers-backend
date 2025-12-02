import { NotificationType, NotificationPriority } from '../../models/notification.schema';

export interface CreateNotificationDto {
  userId: string;
  title: string;
  message: string;
  type?: NotificationType;
  priority?: NotificationPriority;
  actionUrl?: string;
  actionText?: string;
  imageUrl?: string;
  metadata?: Record<string, any>;
}
