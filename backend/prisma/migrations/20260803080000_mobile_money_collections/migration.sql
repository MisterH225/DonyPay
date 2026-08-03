-- CreateEnum
CREATE TYPE "MobileMoneyCollectionStatus" AS ENUM ('pending', 'ussd_sent', 'confirmed', 'failed');

-- CreateTable
CREATE TABLE "mobile_money_collections" (
    "id" TEXT NOT NULL,
    "provider_ref" TEXT NOT NULL,
    "account_id" TEXT NOT NULL,
    "amount" DECIMAL(18,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'XOF',
    "phone" TEXT NOT NULL,
    "operator" TEXT,
    "status" "MobileMoneyCollectionStatus" NOT NULL DEFAULT 'pending',
    "description" TEXT,
    "metadata" JSONB,
    "ussd_hint" TEXT,
    "failure_reason" TEXT,
    "confirmed_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "mobile_money_collections_pkey" PRIMARY KEY ("id")
);

-- Indexes
CREATE UNIQUE INDEX "mobile_money_collections_provider_ref_key" ON "mobile_money_collections"("provider_ref");
CREATE INDEX "mobile_money_collections_account_id_status_idx" ON "mobile_money_collections"("account_id", "status");
CREATE INDEX "mobile_money_collections_status_created_at_idx" ON "mobile_money_collections"("status", "created_at");

-- Foreign Keys
ALTER TABLE "mobile_money_collections"
  ADD CONSTRAINT "mobile_money_collections_account_id_fkey"
  FOREIGN KEY ("account_id") REFERENCES "ledger_accounts"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
