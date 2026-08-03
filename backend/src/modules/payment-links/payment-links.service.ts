import { Injectable } from '@nestjs/common';

@Injectable()
export class PaymentLinksService {
  getHello(): { module: string; message: string } {
    return {
      module: 'payment-links',
      message: 'Hello from payment-links module',
    };
  }
}
