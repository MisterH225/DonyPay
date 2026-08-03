import { Injectable } from '@nestjs/common';

@Injectable()
export class CatalogService {
  getHello(): { module: string; message: string } {
    return {
      module: 'catalog',
      message: 'Hello from catalog module',
    };
  }
}
