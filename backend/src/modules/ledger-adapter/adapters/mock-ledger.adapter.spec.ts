import { BadRequestException, NotFoundException } from '@nestjs/common';
import { LedgerEntryType } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { createInMemoryPrismaFake } from '../testing/in-memory-prisma.fake';
import { MockLedgerAdapter } from './mock-ledger.adapter';

describe('MockLedgerAdapter', () => {
  let adapter: MockLedgerAdapter;
  let prisma: ReturnType<typeof createInMemoryPrismaFake>;

  beforeEach(() => {
    prisma = createInMemoryPrismaFake();
    adapter = new MockLedgerAdapter(prisma as unknown as PrismaService);
  });

  it('opens a savings account and starts at zero', async () => {
    const accountId = await adapter.openSavingsAccount('user-1');

    expect(accountId).toBeDefined();
    await expect(adapter.getBalance(accountId)).resolves.toBe(0);
  });

  it('records a deposit with double-entry append-only writes', async () => {
    const accountId = await adapter.openSavingsAccount('user-1');

    await adapter.recordDeposit(accountId, 100, { source: 'test' });

    expect(await adapter.getBalance(accountId)).toBe(100);
    expect(prisma._entries).toHaveLength(2);

    const [credit, debit] = prisma._entries;
    expect(credit.type).toBe(LedgerEntryType.credit);
    expect(credit.accountId).toBe(accountId);
    expect(Number(credit.amount)).toBe(100);
    expect(Number(credit.balanceAfter)).toBe(100);

    expect(debit.type).toBe(LedgerEntryType.debit);
    expect(debit.accountId).not.toBe(accountId);
    expect(Number(debit.amount)).toBe(100);
  });

  it('records a withdrawal with double-entry and updated balance', async () => {
    const accountId = await adapter.openSavingsAccount('user-1');
    await adapter.recordDeposit(accountId, 100);
    await adapter.recordWithdrawal(accountId, 40);

    expect(await adapter.getBalance(accountId)).toBe(60);
    expect(prisma._entries).toHaveLength(4);

    const savingsEntries = prisma._entries.filter(
      (entry) => entry.accountId === accountId,
    );
    expect(savingsEntries.map((entry) => entry.type)).toEqual([
      LedgerEntryType.credit,
      LedgerEntryType.debit,
    ]);
    expect(
      savingsEntries.map((entry) => Number(entry.balanceAfter)),
    ).toEqual([100, 60]);
  });

  it('never updates or deletes existing ledger entries', async () => {
    const accountId = await adapter.openSavingsAccount('user-1');
    await adapter.recordDeposit(accountId, 50);
    const snapshot = prisma._entries.map((entry) => ({ ...entry }));

    await adapter.recordDeposit(accountId, 25);

    expect(prisma._entries).toHaveLength(4);
    expect(prisma._entries.slice(0, 2)).toEqual(snapshot);
  });

  it('rejects withdrawal above balance', async () => {
    const accountId = await adapter.openSavingsAccount('user-1');
    await adapter.recordDeposit(accountId, 10);

    await expect(adapter.recordWithdrawal(accountId, 11)).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('rejects unknown account', async () => {
    await expect(adapter.getBalance('missing')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('rejects non-positive amounts', async () => {
    const accountId = await adapter.openSavingsAccount('user-1');

    await expect(adapter.recordDeposit(accountId, 0)).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });
});
