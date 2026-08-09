import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
} from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Public } from '../auth/decorators/public.decorator';
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

  @Public()
  @Get('hello')
  getHello() {
    return this.savingsEngineService.getHello();
  }

  @Post('goals')
  createGoal(
    @CurrentUser('userId') userId: string,
    @Body() dto: CreateSavingsGoalDto,
  ) {
    return this.savingsGoalsService.create({ ...dto, userId });
  }

  @Get('goals/:id')
  getGoal(@Param('id', ParseUUIDPipe) id: string) {
    return this.savingsGoalsService.findById(id);
  }

  @Get('users/me/goals')
  listMyGoals(@CurrentUser('userId') userId: string) {
    return this.savingsGoalsService.listByUser(userId);
  }

  @Get('sellers/me/goals')
  listMySellerGoals(@CurrentUser('userId') userId: string) {
    return this.savingsGoalsService.listBySeller(userId);
  }

  @Post('goals/:id/deposits')
  recordDeposit(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RecordDepositDto,
  ) {
    return this.savingsGoalsService.recordDeposit(id, dto);
  }

  /**
   * Remise produit : le vendeur authentifié est l’appelant
   * (vérifié côté service contre le propriétaire de la boutique).
   */
  @Post('goals/:id/confirm-handover')
  confirmHandover(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('userId') sellerId: string,
  ) {
    return this.savingsGoalsService.confirmHandover(id, sellerId);
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
