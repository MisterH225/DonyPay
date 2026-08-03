import {
  LedgerAccountKind,
  LedgerEntryType,
  MobileMoneyCollectionStatus,
  Prisma,
  type LedgerAccount,
  type LedgerEntry,
  type MobileMoneyCollection,
} from '@prisma/client';

type AccountRow = LedgerAccount;
type EntryRow = LedgerEntry;
type CollectionRow = MobileMoneyCollection;

/**
 * Faux Prisma minimal pour tester les adaptateurs ledger sans Postgres.
 * Supporte create / findUnique / findFirst / update / $transaction
 * sur ledger_* et mobile_money_collections.
 */
export function createInMemoryPrismaFake() {
  const accounts: AccountRow[] = [];
  const entries: EntryRow[] = [];
  const collections: CollectionRow[] = [];
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
    mobileMoneyCollection: {
      async create({
        data,
      }: {
        data: {
          providerRef: string;
          accountId: string;
          amount: Prisma.Decimal;
          currency?: string;
          phone: string;
          operator?: string | null;
          description?: string | null;
          metadata?: Prisma.InputJsonValue;
          status?: MobileMoneyCollectionStatus;
          ussdHint?: string | null;
        };
      }) {
        const now = nextDate();
        const row: CollectionRow = {
          id: nextId(),
          providerRef: data.providerRef,
          accountId: data.accountId,
          amount: new Prisma.Decimal(data.amount),
          currency: data.currency ?? 'XOF',
          phone: data.phone,
          operator: data.operator ?? null,
          status: data.status ?? MobileMoneyCollectionStatus.pending,
          description: data.description ?? null,
          metadata: (data.metadata as Prisma.JsonValue) ?? null,
          ussdHint: data.ussdHint ?? null,
          failureReason: null,
          confirmedAt: null,
          createdAt: now,
          updatedAt: now,
        };
        collections.push(row);
        return row;
      },
      async findUnique({
        where,
      }: {
        where: { providerRef?: string; id?: string };
      }) {
        return (
          collections.find((row) => {
            if (where.providerRef) return row.providerRef === where.providerRef;
            if (where.id) return row.id === where.id;
            return false;
          }) ?? null
        );
      },
      async update({
        where,
        data,
      }: {
        where: { id: string };
        data: Partial<{
          status: MobileMoneyCollectionStatus;
          ussdHint: string | null;
          failureReason: string | null;
          confirmedAt: Date | null;
        }>;
      }) {
        const row = collections.find((item) => item.id === where.id);
        if (!row) {
          throw new Error(`mobileMoneyCollection ${where.id} not found`);
        }
        Object.assign(row, data, { updatedAt: nextDate() });
        return row;
      },
    },
    async $transaction<T>(fn: (tx: typeof api) => Promise<T>): Promise<T> {
      return fn(api);
    },
    _accounts: accounts,
    _entries: entries,
    _collections: collections,
  };

  return api;
}

export type InMemoryPrismaFake = ReturnType<typeof createInMemoryPrismaFake>;
