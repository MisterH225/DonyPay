import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

/**
 * Consultation ledger en lecture seule (console admin).
 * Aucune écriture — les mutations restent sur LedgerPort.
 */
@Injectable()
export class LedgerReadService {
  constructor(private readonly prisma: PrismaService) {}

  listAccounts(filters?: { userId?: string }) {
    return this.prisma.ledgerAccount.findMany({
      where: {
        userId: filters?.userId,
      },
      orderBy: { createdAt: 'desc' },
      include: {
        _count: { select: { entries: true } },
      },
    });
  }

  async getAccount(accountId: string) {
    const account = await this.prisma.ledgerAccount.findUnique({
      where: { id: accountId },
      include: {
        _count: { select: { entries: true } },
      },
    });
    if (!account) {
      throw new NotFoundException(`Ledger account ${accountId} not found`);
    }

    const last = await this.prisma.ledgerEntry.findFirst({
      where: { accountId },
      orderBy: { createdAt: 'desc' },
      select: { balanceAfter: true },
    });

    return {
      ...account,
      balance: last?.balanceAfter ?? 0,
    };
  }

  async listEntries(accountId: string, take = 100) {
    await this.getAccount(accountId);
    const limit = Math.min(Math.max(take, 1), 500);

    return this.prisma.ledgerEntry.findMany({
      where: { accountId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }
}
