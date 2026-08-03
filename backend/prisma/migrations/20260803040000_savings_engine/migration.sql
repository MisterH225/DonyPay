-- CreateEnum
CREATE TYPE "SavingsMode" AS ENUM ('schedule', 'flexi');

-- CreateEnum
CREATE TYPE "SavingsGoalStatus" AS ENUM ('active', 'ready_for_withdrawal', 'completed', 'cancelled');

-- CreateEnum
CREATE TYPE "InstallmentStatus" AS ENUM ('pending', 'paid', 'overdue', 'cancelled');

-- CreateTable
CREATE TABLE "savings_goals" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "mode" "SavingsMode" NOT NULL,
    "target_amount" DECIMAL(18,2) NOT NULL,
    "saved_amount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "status" "SavingsGoalStatus" NOT NULL DEFAULT 'active',
    "ledger_account_id" TEXT NOT NULL,
    "flexi_starts_at" TIMESTAMPTZ(6),
    "flexi_ends_at" TIMESTAMPTZ(6),
    "ready_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "savings_goals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "savings_installments" (
    "id" TEXT NOT NULL,
    "goal_id" TEXT NOT NULL,
    "sequence" INTEGER NOT NULL,
    "due_date" TIMESTAMPTZ(6) NOT NULL,
    "amount" DECIMAL(18,2) NOT NULL,
    "status" "InstallmentStatus" NOT NULL DEFAULT 'pending',
    "reminder_sent_at" TIMESTAMPTZ(6),
    "paid_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "savings_installments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "savings_deposits" (
    "id" TEXT NOT NULL,
    "goal_id" TEXT NOT NULL,
    "installment_id" TEXT,
    "amount" DECIMAL(18,2) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "savings_deposits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "metadata" JSONB,
    "read_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- Indexes
CREATE INDEX "savings_goals_user_id_status_idx" ON "savings_goals"("user_id", "status");
CREATE INDEX "savings_goals_product_id_idx" ON "savings_goals"("product_id");
CREATE INDEX "savings_installments_goal_id_due_date_idx" ON "savings_installments"("goal_id", "due_date");
CREATE INDEX "savings_installments_status_due_date_idx" ON "savings_installments"("status", "due_date");
CREATE INDEX "savings_deposits_goal_id_created_at_idx" ON "savings_deposits"("goal_id", "created_at");
CREATE INDEX "notifications_user_id_created_at_idx" ON "notifications"("user_id", "created_at");

-- Foreign Keys
ALTER TABLE "savings_goals"
  ADD CONSTRAINT "savings_goals_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "savings_goals"
  ADD CONSTRAINT "savings_goals_product_id_fkey"
  FOREIGN KEY ("product_id") REFERENCES "products"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "savings_installments"
  ADD CONSTRAINT "savings_installments_goal_id_fkey"
  FOREIGN KEY ("goal_id") REFERENCES "savings_goals"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "savings_deposits"
  ADD CONSTRAINT "savings_deposits_goal_id_fkey"
  FOREIGN KEY ("goal_id") REFERENCES "savings_goals"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "savings_deposits"
  ADD CONSTRAINT "savings_deposits_installment_id_fkey"
  FOREIGN KEY ("installment_id") REFERENCES "savings_installments"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "notifications"
  ADD CONSTRAINT "notifications_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
