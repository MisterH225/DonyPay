import { Injectable } from '@nestjs/common';

@Injectable()
export class NotificationsService {
  getHello(): { module: string; message: string } {
    return {
      module: 'notifications',
      message: 'Hello from notifications module',
    };
  }
}
