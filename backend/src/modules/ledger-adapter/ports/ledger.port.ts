export const LEDGER_PORT = Symbol('LEDGER_PORT');

export type LedgerMetadata = Record<string, unknown>;

/**
 * Port d'accès au ledger bancaire.
 * Les modules consommateurs injectent uniquement ce contrat (LEDGER_PORT),
 * jamais une implémentation concrète.
 */
export interface LedgerPort {
  openSavingsAccount(userId: string): Promise<string>;

  recordDeposit(
    accountId: string,
    amount: number,
    metadata?: LedgerMetadata,
  ): Promise<void>;

  getBalance(accountId: string): Promise<number>;

  recordWithdrawal(accountId: string, amount: number): Promise<void>;
}
