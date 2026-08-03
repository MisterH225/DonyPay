import { Module } from '@nestjs/common';
import { SavingsEngineController } from './savings-engine.controller';
import { SavingsEngineService } from './savings-engine.service';

@Module({
  controllers: [SavingsEngineController],
  providers: [SavingsEngineService],
  exports: [SavingsEngineService],
})
export class SavingsEngineModule {}
