import { Injectable } from '@nestjs/common';

@Injectable()
export class IdentityService {
  getHello(): { module: string; message: string } {
    return {
      module: 'identity',
      message: 'Hello from identity module',
    };
  }
}
