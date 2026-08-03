import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello() {
    return this.appService.getHello();
  }

  /** Healthcheck Railway / load balancers — `GET /api/health`. */
  @Get('health')
  health() {
    return { status: 'ok' };
  }
}
