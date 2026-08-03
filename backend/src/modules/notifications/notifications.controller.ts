import { Controller, Get, Param, ParseUUIDPipe, Patch } from '@nestjs/common';
import { NotificationsService } from './notifications.service';

@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get('hello')
  getHello() {
    return this.notificationsService.getHello();
  }

  @Get('users/:userId')
  listForUser(@Param('userId', ParseUUIDPipe) userId: string) {
    return this.notificationsService.listForUser(userId);
  }

  @Patch(':id/read')
  markRead(@Param('id', ParseUUIDPipe) id: string) {
    return this.notificationsService.markRead(id);
  }
}
