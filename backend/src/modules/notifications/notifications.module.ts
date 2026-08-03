import { Module } from '@nestjs/common';
import { MockNotificationAdapter } from './adapters/mock-notification.adapter';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import { NOTIFICATION_PORT } from './ports/notification.port';

/**
 * Module notifications — événements métier, canaux SMS + push.
 *
 * Provider réel (Yellikasms, etc.) : binder plus tard
 * `{ provide: NOTIFICATION_PORT, useClass: YellikasmsNotificationAdapter }`.
 * MockNotificationAdapter reste privé au module.
 */
@Module({
  controllers: [NotificationsController],
  providers: [
    MockNotificationAdapter,
    {
      provide: NOTIFICATION_PORT,
      useExisting: MockNotificationAdapter,
    },
    NotificationsService,
  ],
  exports: [NotificationsService, NOTIFICATION_PORT],
})
export class NotificationsModule {}
