import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { DisputeStatus } from '@prisma/client';
import { Public } from '../auth/decorators/public.decorator';
import { UpdateDisputeStatusDto } from '../disputes/dto/update-dispute-status.dto';
import { AdminService } from './admin.service';
import { AdminDisputeMessageDto } from './dto/admin-dispute-message.dto';
import { RejectKycDto } from './dto/reject-kyc.dto';
import { AdminApiKeyGuard } from './guards/admin-api-key.guard';

/** Admin : `@Public()` pour bypass JWT — auth via `AdminApiKeyGuard`. */
@Public()
@Controller('admin')
@UseGuards(AdminApiKeyGuard)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('hello')
  getHello() {
    return this.adminService.getHello();
  }

  // ---- KYC ----

  @Get('kyc/pending')
  listPendingKyc() {
    return this.adminService.listPendingKyc();
  }

  @Get('kyc/:userId')
  getKyc(@Param('userId', ParseUUIDPipe) userId: string) {
    return this.adminService.getKyc(userId);
  }

  @Post('kyc/:userId/approve')
  approveKyc(@Param('userId', ParseUUIDPipe) userId: string) {
    return this.adminService.approveKyc(userId);
  }

  @Post('kyc/:userId/reject')
  rejectKyc(
    @Param('userId', ParseUUIDPipe) userId: string,
    @Body() dto: RejectKycDto,
  ) {
    return this.adminService.rejectKyc(userId, dto.reason);
  }

  // ---- Ledger (lecture seule) ----

  @Get('ledger/accounts')
  listAccounts(@Query('userId') userId?: string) {
    return this.adminService.listLedgerAccounts(userId);
  }

  @Get('ledger/accounts/:accountId')
  getAccount(@Param('accountId', ParseUUIDPipe) accountId: string) {
    return this.adminService.getLedgerAccount(accountId);
  }

  @Get('ledger/accounts/:accountId/entries')
  listEntries(
    @Param('accountId', ParseUUIDPipe) accountId: string,
    @Query('take') take?: string,
  ) {
    const n = take ? Number(take) : undefined;
    return this.adminService.listLedgerEntries(
      accountId,
      Number.isFinite(n) ? n : undefined,
    );
  }

  // ---- Disputes ----

  @Get('disputes')
  listDisputes(@Query('status') status?: string) {
    const allowed = Object.values(DisputeStatus) as string[];
    const filtered =
      status && allowed.includes(status)
        ? (status as DisputeStatus)
        : undefined;
    return this.adminService.listDisputes(filtered);
  }

  @Get('disputes/:id')
  getDispute(@Param('id', ParseUUIDPipe) id: string) {
    return this.adminService.getDispute(id);
  }

  @Patch('disputes/:id/status')
  updateDisputeStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateDisputeStatusDto,
  ) {
    return this.adminService.updateDisputeStatus(id, dto);
  }

  @Post('disputes/:id/messages')
  addDisputeMessage(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AdminDisputeMessageDto,
  ) {
    return this.adminService.addDisputeMessage(id, dto.body);
  }
}
