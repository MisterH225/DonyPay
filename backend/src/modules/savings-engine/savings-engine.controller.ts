import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
} from '@nestjs/common';
import { CreateSavingsGoalDto } from './dto/create-savings-goal.dto';
import { RecordDepositDto } from './dto/record-deposit.dto';
import { SavingsEngineService } from './savings-engine.service';
import { SavingsGoalsService } from './savings-goals.service';

@Controller('savings-engine')
export class SavingsEngineController {
  constructor(
    private readonly savingsEngineService: SavingsEngineService,
    private readonly savingsGoalsService: SavingsGoalsService,
  ) {}

  @Get('hello')
  getHello() {
    return this.savingsEngineService.getHello();
  }

  @Post('goals')
  createGoal(@Body() dto: CreateSavingsGoalDto) {
    return this.savingsGoalsService.create(dto);
  }

  @Get('goals/:id')
  getGoal(@Param('id', ParseUUIDPipe) id: string) {
    return this.savingsGoalsService.findById(id);
  }

  @Get('users/:userId/goals')
  listUserGoals(@Param('userId', ParseUUIDPipe) userId: string) {
    return this.savingsGoalsService.listByUser(userId);
  }

  @Post('goals/:id/deposits')
  recordDeposit(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RecordDepositDto,
  ) {
    return this.savingsGoalsService.recordDeposit(id, dto);
  }

  @Post('goals/:id/cancel')
  cancelGoal(@Param('id', ParseUUIDPipe) id: string) {
    return this.savingsGoalsService.cancel(id);
  }

  @Post('reminders/dispatch')
  dispatchReminders() {
    return this.savingsGoalsService.dispatchDueReminders();
  }
}
