-- AlterTable: payer info on installments
ALTER TABLE "savings_installments" ADD COLUMN "payer_name" TEXT;
ALTER TABLE "savings_installments" ADD COLUMN "payer_phone" TEXT;
ALTER TABLE "savings_installments" ADD COLUMN "payer_operator" TEXT;

-- CreateEnum
CREATE TYPE "PaymentLinkStatus" AS ENUM ('pending', 'paid', 'expired', 'cancelled');

-- CreateTable
CREATE TABLE "payment_links" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "installment_id" TEXT NOT NULL,
    "amount" DECIMAL(18,2) NOT NULL,
    "status" "PaymentLinkStatus" NOT NULL DEFAULT 'pending',
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "used_at" TIMESTAMPTZ(6),
    "payer_name" TEXT,
    "payer_phone" TEXT,
    "payer_operator" TEXT,
    "provider_ref" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "payment_links_pkey" PRIMARY KEY ("id")
);

-- Indexes
CREATE UNIQUE INDEX "payment_links_token_key" ON "payment_links"("token");
CREATE INDEX "payment_links_installment_id_status_idx" ON "payment_links"("installment_id", "status");
CREATE INDEX "payment_links_expires_at_idx" ON "payment_links"("expires_at");

-- Foreign Keys
ALTER TABLE "payment_links"
  ADD CONSTRAINT "payment_links_installment_id_fkey"
  FOREIGN KEY ("installment_id") REFERENCES "savings_installments"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
