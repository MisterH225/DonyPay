import { Controller, Get } from '@nestjs/common';
import { SavingsEngineService } from './savings-engine.service';

@Controller('savings-engine')
export class SavingsEngineController {
  constructor(private readonly savingsEngineService: SavingsEngineService) {}

  @Get('hello')
  getHello() {
    return this.savingsEngineService.getHello();
  }
}
