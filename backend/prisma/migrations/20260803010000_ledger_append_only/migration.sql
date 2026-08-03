-- CreateEnum
CREATE TYPE "LedgerEntryType" AS ENUM ('debit', 'credit');

-- CreateEnum
CREATE TYPE "LedgerAccountKind" AS ENUM ('savings', 'clearing');

-- CreateTable
CREATE TABLE "ledger_accounts" (
    "id" TEXT NOT NULL,
    "user_id" TEXT,
    "kind" "LedgerAccountKind" NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ledger_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ledger_entries" (
    "id" TEXT NOT NULL,
    "account_id" TEXT NOT NULL,
    "type" "LedgerEntryType" NOT NULL,
    "amount" DECIMAL(18,2) NOT NULL,
    "balance_after" DECIMAL(18,2) NOT NULL,
    "metadata" JSONB,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ledger_entries_pkey" PRIMARY KEY ("id")
);

-- Indexes
CREATE INDEX "ledger_accounts_user_id_idx" ON "ledger_accounts"("user_id");
CREATE INDEX "ledger_entries_account_id_created_at_idx" ON "ledger_entries"("account_id", "created_at");

-- Foreign Keys
ALTER TABLE "ledger_entries"
  ADD CONSTRAINT "ledger_entries_account_id_fkey"
  FOREIGN KEY ("account_id") REFERENCES "ledger_accounts"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

-- Append-only guard: forbid UPDATE / DELETE on ledger_entries
CREATE OR REPLACE FUNCTION forbid_ledger_entries_mutation()
RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'ledger_entries is append-only: % is not allowed', TG_OP;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER ledger_entries_no_update
  BEFORE UPDATE ON "ledger_entries"
  FOR EACH ROW
  EXECUTE PROCEDURE forbid_ledger_entries_mutation();

CREATE TRIGGER ledger_entries_no_delete
  BEFORE DELETE ON "ledger_entries"
  FOR EACH ROW
  EXECUTE PROCEDURE forbid_ledger_entries_mutation();
