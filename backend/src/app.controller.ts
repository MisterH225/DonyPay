import { Controller, Get } from '@nestjs/common';
import { Public } from './modules/auth/decorators/public.decorator';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Public()
  @Get()
  getHello() {
    return this.appService.getHello();
  }

  /** Healthcheck Railway / load balancers — `GET /api/health`. */
  @Public()
  @Get('health')
  health() {
    return { status: 'ok' };
  }
}
