import { Controller, Get } from '@nestjs/common';
import { DisputesService } from './disputes.service';

@Controller('disputes')
export class DisputesController {
  constructor(private readonly disputesService: DisputesService) {}

  @Get('hello')
  getHello() {
    return this.disputesService.getHello();
  }
}
