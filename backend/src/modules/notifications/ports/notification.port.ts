export const NOTIFICATION_PORT = Symbol('NOTIFICATION_PORT');

/** Canaux supportés (SMS + push). */
export enum NotificationChannel {
  sms = 'sms',
  push = 'push',
}

/**
 * Événements métier déclencheurs.
 * Le provider concret (ex. Yellikasms) s'abonne à ce contrat via NotificationPort.
 */
export enum NotificationEventType {
  /** Versement reçu sur un objectif d'épargne. */
  deposit_received = 'deposit_received',
  /** Objectif d'épargne atteint (prêt pour retrait). */
  goal_reached = 'goal_reached',
  /** Échéance à venir / rappel. */
  installment_due = 'installment_due',
  /** Lien de paiement réglé par un tiers. */
  payment_link_paid_by_third_party = 'payment_link_paid_by_third_party',
  /** Plan d'épargne annulé. */
  plan_cancelled = 'plan_cancelled',
}

export type NotificationPayload = {
  event: NotificationEventType;
  userId: string;
  title: string;
  body: string;
  /** Destinataire SMS (si canal sms). */
  phone?: string | null;
  /** Token device push (si canal push). */
  pushToken?: string | null;
  channels: NotificationChannel[];
  metadata?: Record<string, unknown>;
};

/**
 * Port de notification découplé du provider (Yellikasms, FCM, etc.).
 * Binder `{ provide: NOTIFICATION_PORT, useClass: YourAdapter }`.
 * Aucune implémentation provider réelle ici — MockNotificationAdapter uniquement.
 */
export interface NotificationPort {
  send(payload: NotificationPayload): Promise<void>;
}
