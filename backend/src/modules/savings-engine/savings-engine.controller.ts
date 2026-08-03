import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
} from '@nestjs/common';
import { ConfirmHandoverDto } from './dto/confirm-handover.dto';
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

  @Get('sellers/:sellerId/goals')
  listSellerGoals(@Param('sellerId', ParseUUIDPipe) sellerId: string) {
    return this.savingsGoalsService.listBySeller(sellerId);
  }

  @Post('goals/:id/deposits')
  recordDeposit(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RecordDepositDto,
  ) {
    return this.savingsGoalsService.recordDeposit(id, dto);
  }

  @Post('goals/:id/confirm-handover')
  confirmHandover(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ConfirmHandoverDto,
  ) {
    return this.savingsGoalsService.confirmHandover(id, dto.sellerId);
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
