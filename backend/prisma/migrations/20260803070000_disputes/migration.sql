-- CreateEnum
CREATE TYPE "DisputeReason" AS ENUM ('non_conforming_product', 'payment_not_received', 'third_party_payer');

-- CreateEnum
CREATE TYPE "DisputeStatus" AS ENUM ('open', 'in_progress', 'resolved', 'rejected');

-- CreateEnum
CREATE TYPE "DisputeSubjectType" AS ENUM ('savings_goal', 'payment_link');

-- CreateTable
CREATE TABLE "disputes" (
    "id" TEXT NOT NULL,
    "opened_by_id" TEXT NOT NULL,
    "reason" "DisputeReason" NOT NULL,
    "status" "DisputeStatus" NOT NULL DEFAULT 'open',
    "subject_type" "DisputeSubjectType" NOT NULL,
    "savings_goal_id" TEXT,
    "payment_link_id" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "resolution_note" TEXT,
    "resolved_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "disputes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dispute_messages" (
    "id" TEXT NOT NULL,
    "dispute_id" TEXT NOT NULL,
    "author_id" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "dispute_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dispute_attachments" (
    "id" TEXT NOT NULL,
    "dispute_id" TEXT NOT NULL,
    "uploaded_by_id" TEXT NOT NULL,
    "storage_key" TEXT NOT NULL,
    "original_name" TEXT NOT NULL,
    "mime_type" TEXT NOT NULL,
    "size_bytes" INTEGER NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "dispute_attachments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dispute_ratings" (
    "id" TEXT NOT NULL,
    "dispute_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "score" INTEGER NOT NULL,
    "comment" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "dispute_ratings_pkey" PRIMARY KEY ("id")
);

-- Indexes
CREATE INDEX "disputes_opened_by_id_status_idx" ON "disputes"("opened_by_id", "status");
CREATE INDEX "disputes_savings_goal_id_idx" ON "disputes"("savings_goal_id");
CREATE INDEX "disputes_payment_link_id_idx" ON "disputes"("payment_link_id");
CREATE INDEX "disputes_status_created_at_idx" ON "disputes"("status", "created_at");
CREATE INDEX "dispute_messages_dispute_id_created_at_idx" ON "dispute_messages"("dispute_id", "created_at");
CREATE INDEX "dispute_attachments_dispute_id_idx" ON "dispute_attachments"("dispute_id");
CREATE UNIQUE INDEX "dispute_ratings_dispute_id_key" ON "dispute_ratings"("dispute_id");
CREATE INDEX "dispute_ratings_user_id_idx" ON "dispute_ratings"("user_id");

-- Foreign Keys
ALTER TABLE "disputes"
  ADD CONSTRAINT "disputes_opened_by_id_fkey"
  FOREIGN KEY ("opened_by_id") REFERENCES "users"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "disputes"
  ADD CONSTRAINT "disputes_savings_goal_id_fkey"
  FOREIGN KEY ("savings_goal_id") REFERENCES "savings_goals"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "disputes"
  ADD CONSTRAINT "disputes_payment_link_id_fkey"
  FOREIGN KEY ("payment_link_id") REFERENCES "payment_links"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "dispute_messages"
  ADD CONSTRAINT "dispute_messages_dispute_id_fkey"
  FOREIGN KEY ("dispute_id") REFERENCES "disputes"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "dispute_messages"
  ADD CONSTRAINT "dispute_messages_author_id_fkey"
  FOREIGN KEY ("author_id") REFERENCES "users"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "dispute_attachments"
  ADD CONSTRAINT "dispute_attachments_dispute_id_fkey"
  FOREIGN KEY ("dispute_id") REFERENCES "disputes"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "dispute_attachments"
  ADD CONSTRAINT "dispute_attachments_uploaded_by_id_fkey"
  FOREIGN KEY ("uploaded_by_id") REFERENCES "users"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "dispute_ratings"
  ADD CONSTRAINT "dispute_ratings_dispute_id_fkey"
  FOREIGN KEY ("dispute_id") REFERENCES "disputes"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "dispute_ratings"
  ADD CONSTRAINT "dispute_ratings_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

-- Au moins un sujet (plan d'épargne ou paiement délégué)
ALTER TABLE "disputes"
  ADD CONSTRAINT "disputes_subject_required_check"
  CHECK (
    ("subject_type" = 'savings_goal' AND "savings_goal_id" IS NOT NULL)
    OR
    ("subject_type" = 'payment_link' AND "payment_link_id" IS NOT NULL)
  );

-- Score de notation entre 1 et 5
ALTER TABLE "dispute_ratings"
  ADD CONSTRAINT "dispute_ratings_score_range_check"
  CHECK ("score" >= 1 AND "score" <= 5);
