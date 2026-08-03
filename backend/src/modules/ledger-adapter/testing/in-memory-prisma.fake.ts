import {
  LedgerAccountKind,
  LedgerEntryType,
  Prisma,
  type LedgerAccount,
  type LedgerEntry,
} from '@prisma/client';

type AccountRow = LedgerAccount;
type EntryRow = LedgerEntry;

/**
 * Faux Prisma minimal pour tester MockLedgerAdapter sans Postgres.
 * Supporte create / findUnique / findFirst / $transaction sur ledger_*.
 */
export function createInMemoryPrismaFake() {
  const accounts: AccountRow[] = [];
  const entries: EntryRow[] = [];
  let clock = Date.now();
  let seq = 0;

  const nextDate = () => new Date(++clock);
  const nextId = () => `id-${String(++seq).padStart(6, '0')}`;

  const api = {
    ledgerAccount: {
      async create({ data }: { data: { userId?: string | null; kind: LedgerAccountKind } }) {
        const row: AccountRow = {
          id: nextId(),
          userId: data.userId ?? null,
          kind: data.kind,
          createdAt: nextDate(),
        };
        accounts.push(row);
        return row;
      },
      async findUnique({ where }: { where: { id: string } }) {
        return accounts.find((account) => account.id === where.id) ?? null;
      },
      async findFirst({
        where,
      }: {
        where: { kind?: LedgerAccountKind; userId?: string };
      }) {
        return (
          accounts.find((account) => {
            if (where.kind && account.kind !== where.kind) return false;
            if (where.userId && account.userId !== where.userId) return false;
            return true;
          }) ?? null
        );
      },
    },
    ledgerEntry: {
      async create({
        data,
      }: {
        data: {
          accountId: string;
          type: LedgerEntryType;
          amount: Prisma.Decimal;
          balanceAfter: Prisma.Decimal;
          metadata?: Prisma.InputJsonValue;
        };
      }) {
        const row: EntryRow = {
          id: nextId(),
          accountId: data.accountId,
          type: data.type,
          amount: new Prisma.Decimal(data.amount),
          balanceAfter: new Prisma.Decimal(data.balanceAfter),
          metadata: (data.metadata as Prisma.JsonValue) ?? null,
          createdAt: nextDate(),
        };
        entries.push(row);
        return row;
      },
      async findFirst({
        where,
        orderBy,
        select,
      }: {
        where: { accountId: string };
        orderBy?: Array<{ createdAt?: 'asc' | 'desc'; id?: 'asc' | 'desc' }>;
        select?: { balanceAfter?: true };
      }) {
        const filtered = entries.filter(
          (entry) => entry.accountId === where.accountId,
        );

        filtered.sort((a, b) => {
          for (const rule of orderBy ?? []) {
            if (rule.createdAt) {
              const delta =
                a.createdAt.getTime() - b.createdAt.getTime();
              if (delta !== 0) {
                return rule.createdAt === 'desc' ? -delta : delta;
              }
            }
            if (rule.id) {
              const delta = a.id.localeCompare(b.id);
              if (delta !== 0) {
                return rule.id === 'desc' ? -delta : delta;
              }
            }
          }
          return 0;
        });

        const first = filtered[0];
        if (!first) return null;
        if (select?.balanceAfter) {
          return { balanceAfter: first.balanceAfter };
        }
        return first;
      },
      async findMany({ where }: { where?: { accountId?: string } } = {}) {
        if (!where?.accountId) return [...entries];
        return entries.filter((entry) => entry.accountId === where.accountId);
      },
    },
    async $transaction<T>(fn: (tx: typeof api) => Promise<T>): Promise<T> {
      return fn(api);
    },
    _accounts: accounts,
    _entries: entries,
  };

  return api;
}

export type InMemoryPrismaFake = ReturnType<typeof createInMemoryPrismaFake>;
