import { Injectable } from '@nestjs/common';

@Injectable()
export class DisputesService {
  getHello(): { module: string; message: string } {
    return {
      module: 'disputes',
      message: 'Hello from disputes module',
    };
  }
}
