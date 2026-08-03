export const SMS_SENDER_PORT = Symbol('SMS_SENDER_PORT');

/**
 * Envoi SMS pour le challenge 2FA.
 * Stub console par défaut — remplacer par un vrai prestataire (Twilio, etc.).
 */
export interface SmsSenderPort {
  sendSms(phone: string, message: string): Promise<void>;
}
