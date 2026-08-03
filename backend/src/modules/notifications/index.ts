export { NotificationsModule } from './notifications.module';
export { NotificationsService } from './notifications.service';
export type { EmitNotificationInput } from './notifications.service';
export {
  NOTIFICATION_PORT,
  NotificationChannel,
  NotificationEventType,
  type NotificationPayload,
  type NotificationPort,
} from './ports/notification.port';
