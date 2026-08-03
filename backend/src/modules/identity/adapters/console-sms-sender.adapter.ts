import { Injectable, Logger } from '@nestjs/common';
import { SmsSenderPort } from '../ports/sms-sender.port';

/** Stub SMS : log le message (aucun envoi réel). */
@Injectable()
export class ConsoleSmsSenderAdapter implements SmsSenderPort {
  private readonly logger = new Logger(ConsoleSmsSenderAdapter.name);

  async sendSms(phone: string, message: string): Promise<void> {
    this.logger.log(`[SMS stub] to=${phone} message=${message}`);
  }
}
