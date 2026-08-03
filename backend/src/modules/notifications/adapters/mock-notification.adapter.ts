import { Injectable, Logger } from '@nestjs/common';
import {
  NotificationChannel,
  NotificationPayload,
  NotificationPort,
} from '../ports/notification.port';

/**
 * Adaptateur mock : logue SMS + push en console.
 * Remplaçable plus tard par un adaptateur Yellikasms (SMS) / FCM (push)
 * sans changer les consommateurs (NOTIFICATION_PORT).
 */
@Injectable()
export class MockNotificationAdapter implements NotificationPort {
  private readonly logger = new Logger(MockNotificationAdapter.name);

  async send(payload: NotificationPayload): Promise<void> {
    for (const channel of payload.channels) {
      if (channel === NotificationChannel.sms) {
        this.logger.log(
          `[SMS mock] event=${payload.event} to=${payload.phone ?? 'n/a'} user=${payload.userId} title="${payload.title}" body="${payload.body}"`,
        );
      }

      if (channel === NotificationChannel.push) {
        this.logger.log(
          `[PUSH mock] event=${payload.event} token=${payload.pushToken ?? 'n/a'} user=${payload.userId} title="${payload.title}" body="${payload.body}"`,
        );
      }
    }
  }
}
