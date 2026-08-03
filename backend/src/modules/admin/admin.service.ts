import { Injectable, OnModuleInit } from '@nestjs/common';
import { DisputeStatus, KycStatus, UserRole, UserType } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { DisputesService } from '../disputes/disputes.service';
import { KycService } from '../identity/kyc.service';
import { LedgerReadService } from '../ledger-adapter/ledger-read.service';
import { UpdateDisputeStatusDto } from '../disputes/dto/update-dispute-status.dto';

const SYSTEM_ADMIN_EMAIL = 'admin@donypay.internal';

@Injectable()
export class AdminService implements OnModuleInit {
  constructor(
    private readonly prisma: PrismaService,
    private readonly kyc: KycService,
    private readonly ledger: LedgerReadService,
    private readonly disputes: DisputesService,
  ) {}

  async onModuleInit() {
    if (!process.env.ADMIN_API_KEY?.trim()) return;
    await this.ensureSystemAdmin();
  }

  getHello() {
    return {
      module: 'admin',
      message: 'DonyPay admin API — KYC, ledger (read-only), disputes',
    };
  }

  listPendingKyc() {
    return this.kyc.listPendingReviews();
  }

  getKyc(userId: string) {
    return this.kyc.getStatus(userId);
  }

  approveKyc(userId: string) {
    return this.kyc.approveManual(userId);
  }

  rejectKyc(userId: string, reason: string) {
    return this.kyc.rejectManual(userId, reason);
  }

  listLedgerAccounts(userId?: string) {
    return this.ledger.listAccounts({ userId });
  }

  getLedgerAccount(accountId: string) {
    return this.ledger.getAccount(accountId);
  }

  listLedgerEntries(accountId: string, take?: number) {
    return this.ledger.listEntries(accountId, take);
  }

  listDisputes(status?: DisputeStatus) {
    return this.disputes.listAll(status);
  }

  getDispute(id: string) {
    return this.disputes.findById(id);
  }

  updateDisputeStatus(id: string, dto: UpdateDisputeStatusDto) {
    return this.disputes.updateStatus(id, dto);
  }

  async addDisputeMessage(id: string, body: string) {
    const admin = await this.ensureSystemAdmin();
    return this.disputes.addMessage(id, {
      authorId: admin.id,
      body,
    });
  }

  private async ensureSystemAdmin() {
    const existing = await this.prisma.user.findFirst({
      where: { role: UserRole.admin },
      orderBy: { createdAt: 'asc' },
    });
    if (existing) return existing;

    return this.prisma.user.create({
      data: {
        email: SYSTEM_ADMIN_EMAIL,
        type: UserType.company,
        role: UserRole.admin,
        companyName: 'DonyPay Ops',
        siret: '00000000000000',
        kycStatus: KycStatus.verified,
        firstName: 'Admin',
        lastName: 'DonyPay',
      },
    });
  }
}
