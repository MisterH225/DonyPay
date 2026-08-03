import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  LedgerAccountKind,
  LedgerEntryType,
  Prisma,
  type LedgerAccount,
} from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { LedgerMetadata, LedgerPort } from '../ports/ledger.port';

const SYSTEM_CLEARING_USER_ID = '__system_clearing__';

/**
 * Adaptateur mock : simule un ledger bancaire en DB locale (Prisma)
 * avec écritures en partie double append-only sur `ledger_entries`.
 *
 * Aucun UPDATE / DELETE : seules des insertions sont effectuées.
 * Remplaçable plus tard par un adaptateur bancaire réel via LEDGER_PORT.
 */
@Injectable()
export class MockLedgerAdapter implements LedgerPort {
  constructor(private readonly prisma: PrismaService) {}

  async openSavingsAccount(userId: string): Promise<string> {
    if (!userId?.trim()) {
      throw new BadRequestException('userId is required');
    }

    const account = await this.prisma.ledgerAccount.create({
      data: {
        userId,
        kind: LedgerAccountKind.savings,
      },
    });

    return account.id;
  }

  async recordDeposit(
    accountId: string,
    amount: number,
    metadata: LedgerMetadata = {},
  ): Promise<void> {
    const decimalAmount = this.toPositiveAmount(amount);
    const account = await this.requireSavingsAccount(accountId);
    const clearing = await this.ensureClearingAccount();

    await this.prisma.$transaction(async (tx) => {
      const savingsBalance = await this.latestBalance(tx, account.id);
      const clearingBalance = await this.latestBalance(tx, clearing.id);

      // Compte épargne (passif) : un crédit augmente le solde client.
      await tx.ledgerEntry.create({
        data: {
          accountId: account.id,
          type: LedgerEntryType.credit,
          amount: decimalAmount,
          balanceAfter: savingsBalance.add(decimalAmount),
          metadata: {
            ...metadata,
            operation: 'deposit',
            counterpartAccountId: clearing.id,
          },
        },
      });

      // Compte de compensation : débit en partie double.
      await tx.ledgerEntry.create({
        data: {
          accountId: clearing.id,
          type: LedgerEntryType.debit,
          amount: decimalAmount,
          balanceAfter: clearingBalance.sub(decimalAmount),
          metadata: {
            ...metadata,
            operation: 'deposit',
            counterpartAccountId: account.id,
          },
        },
      });
    });
  }

  async getBalance(accountId: string): Promise<number> {
    await this.requireAccount(accountId);
    const balance = await this.latestBalance(this.prisma, accountId);
    return balance.toNumber();
  }

  async recordWithdrawal(accountId: string, amount: number): Promise<void> {
    const decimalAmount = this.toPositiveAmount(amount);
    const account = await this.requireSavingsAccount(accountId);
    const clearing = await this.ensureClearingAccount();

    await this.prisma.$transaction(async (tx) => {
      const savingsBalance = await this.latestBalance(tx, account.id);

      if (savingsBalance.lessThan(decimalAmount)) {
        throw new BadRequestException('Insufficient balance');
      }

      const clearingBalance = await this.latestBalance(tx, clearing.id);

      // Compte épargne : un débit diminue le solde client.
      await tx.ledgerEntry.create({
        data: {
          accountId: account.id,
          type: LedgerEntryType.debit,
          amount: decimalAmount,
          balanceAfter: savingsBalance.sub(decimalAmount),
          metadata: {
            operation: 'withdrawal',
            counterpartAccountId: clearing.id,
          },
        },
      });

      // Compte de compensation : crédit en partie double.
      await tx.ledgerEntry.create({
        data: {
          accountId: clearing.id,
          type: LedgerEntryType.credit,
          amount: decimalAmount,
          balanceAfter: clearingBalance.add(decimalAmount),
          metadata: {
            operation: 'withdrawal',
            counterpartAccountId: account.id,
          },
        },
      });
    });
  }

  private toPositiveAmount(amount: number): Prisma.Decimal {
    if (!Number.isFinite(amount) || amount <= 0) {
      throw new BadRequestException('amount must be a positive number');
    }

    return new Prisma.Decimal(amount).toDecimalPlaces(2);
  }

  private async requireAccount(accountId: string): Promise<LedgerAccount> {
    const account = await this.prisma.ledgerAccount.findUnique({
      where: { id: accountId },
    });

    if (!account) {
      throw new NotFoundException(`Ledger account ${accountId} not found`);
    }

    return account;
  }

  private async requireSavingsAccount(
    accountId: string,
  ): Promise<LedgerAccount> {
    const account = await this.requireAccount(accountId);

    if (account.kind !== LedgerAccountKind.savings) {
      throw new BadRequestException(
        'Operation allowed on savings accounts only',
      );
    }

    return account;
  }

  private async ensureClearingAccount(): Promise<LedgerAccount> {
    const existing = await this.prisma.ledgerAccount.findFirst({
      where: {
        kind: LedgerAccountKind.clearing,
        userId: SYSTEM_CLEARING_USER_ID,
      },
    });

    if (existing) {
      return existing;
    }

    return this.prisma.ledgerAccount.create({
      data: {
        userId: SYSTEM_CLEARING_USER_ID,
        kind: LedgerAccountKind.clearing,
      },
    });
  }

  private async latestBalance(
    client: Prisma.TransactionClient | PrismaService,
    accountId: string,
  ): Promise<Prisma.Decimal> {
    const lastEntry = await client.ledgerEntry.findFirst({
      where: { accountId },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      select: { balanceAfter: true },
    });

    return lastEntry?.balanceAfter ?? new Prisma.Decimal(0);
  }
}
