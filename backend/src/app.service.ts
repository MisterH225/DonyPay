import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHello(): { app: string; message: string } {
    return {
      app: 'donypay-backend',
      message: 'Hello from DonyPay API',
    };
  }
}
