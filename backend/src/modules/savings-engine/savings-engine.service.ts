import { Injectable } from '@nestjs/common';

@Injectable()
export class SavingsEngineService {
  getHello(): { module: string; message: string } {
    return {
      module: 'savings-engine',
      message: 'Hello from savings-engine module',
    };
  }
}
