import { Controller, Get } from '@nestjs/common';
import { IdentityService } from './identity.service';

@Controller('identity')
export class IdentityController {
  constructor(private readonly identityService: IdentityService) {}

  @Get('hello')
  getHello() {
    return this.identityService.getHello();
  }
}
