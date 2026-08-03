import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, type Notification } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateNotificationDto } from './dto/create-notification.dto';
import {
  NOTIFICATION_PORT,
  NotificationChannel,
  NotificationEventType,
  type NotificationPort,
} from './ports/notification.port';

const DEFAULT_CHANNELS = [NotificationChannel.sms, NotificationChannel.push];

export type EmitNotificationInput = {
  userId: string;
  title: string;
  body: string;
  phone?: string | null;
  pushToken?: string | null;
  metadata?: Record<string, unknown>;
  channels?: NotificationChannel[];
};

@Injectable()
export class NotificationsService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(NOTIFICATION_PORT)
    private readonly notifier: NotificationPort,
  ) {}

  getHello(): { module: string; message: string } {
    return {
      module: 'notifications',
      message: 'Hello from notifications module',
    };
  }

  /** Versement reçu. */
  notifyDepositReceived(input: EmitNotificationInput) {
    return this.emit(NotificationEventType.deposit_received, input);
  }

  /** Objectif atteint. */
  notifyGoalReached(input: EmitNotificationInput) {
    return this.emit(NotificationEventType.goal_reached, input);
  }

  /** Échéance à venir. */
  notifyInstallmentDue(input: EmitNotificationInput) {
    return this.emit(NotificationEventType.installment_due, input);
  }

  /** Lien de paiement payé par un tiers. */
  notifyPaymentLinkPaidByThirdParty(input: EmitNotificationInput) {
    return this.emit(
      NotificationEventType.payment_link_paid_by_third_party,
      input,
    );
  }

  /** Plan d'épargne annulé. */
  notifyPlanCancelled(input: EmitNotificationInput) {
    return this.emit(NotificationEventType.plan_cancelled, input);
  }

  /**
   * Persiste la notification et la dispatch via NotificationPort (SMS + push).
   * Les consommateurs métier préfèrent les helpers typés ci-dessus.
   */
  async notify(dto: CreateNotificationDto): Promise<Notification> {
    return this.emit(dto.type as NotificationEventType, {
      userId: dto.userId,
      title: dto.title,
      body: dto.body,
      phone: dto.phone,
      pushToken: dto.pushToken,
      metadata: dto.metadata,
    });
  }

  async listForUser(userId: string): Promise<Notification[]> {
    return this.prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async markRead(id: string): Promise<Notification> {
    const existing = await this.prisma.notification.findUnique({
      where: { id },
    });
    if (!existing) {
      throw new NotFoundException(`Notification ${id} not found`);
    }

    return this.prisma.notification.update({
      where: { id },
      data: { readAt: new Date() },
    });
  }

  private async emit(
    event: NotificationEventType,
    input: EmitNotificationInput,
  ): Promise<Notification> {
    const channels = input.channels?.length ? input.channels : DEFAULT_CHANNELS;

    const record = await this.prisma.notification.create({
      data: {
        userId: input.userId,
        type: event,
        title: input.title,
        body: input.body,
        metadata: {
          ...(input.metadata ?? {}),
          channels,
        },
      },
    });

    await this.notifier.send({
      event,
      userId: input.userId,
      title: input.title,
      body: input.body,
      phone: input.phone,
      pushToken: input.pushToken,
      channels,
      metadata: {
        ...(input.metadata ?? {}),
        notificationId: record.id,
      },
    });

    return record;
  }
}
