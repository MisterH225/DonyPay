import { MockNotificationAdapter } from './mock-notification.adapter';
import {
  NotificationChannel,
  NotificationEventType,
} from '../ports/notification.port';

describe('MockNotificationAdapter', () => {
  it('accepte SMS et push sans erreur ni appel réseau', async () => {
    const adapter = new MockNotificationAdapter();

    await expect(
      adapter.send({
        event: NotificationEventType.deposit_received,
        userId: 'user-1',
        title: 'Versement reçu',
        body: '1000 XOF crédités',
        channels: [NotificationChannel.sms, NotificationChannel.push],
        phone: '+2250700000000',
        metadata: { amount: 1000 },
      }),
    ).resolves.toBeUndefined();
  });

  it('ignore un canal SMS sans numéro', async () => {
    const adapter = new MockNotificationAdapter();

    await expect(
      adapter.send({
        event: NotificationEventType.installment_due,
        userId: 'user-1',
        title: 'Échéance',
        body: 'Rappel',
        channels: [NotificationChannel.sms],
      }),
    ).resolves.toBeUndefined();
  });
});
