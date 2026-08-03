-- CreateEnum
CREATE TYPE "UserType" AS ENUM ('individual', 'company');

-- CreateEnum
CREATE TYPE "KycStatus" AS ENUM ('pending', 'verified', 'rejected');

-- CreateEnum
CREATE TYPE "KycDocumentType" AS ENUM ('identity_document', 'proof_of_address');

-- CreateEnum
CREATE TYPE "TwoFactorMethod" AS ENUM ('totp', 'sms');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "type" "UserType" NOT NULL,
    "first_name" TEXT,
    "last_name" TEXT,
    "company_name" TEXT,
    "siret" TEXT,
    "kyc_status" "KycStatus" NOT NULL DEFAULT 'pending',
    "kyc_reviewed_at" TIMESTAMPTZ(6),
    "kyc_reject_reason" TEXT,
    "external_kyc_id" TEXT,
    "two_factor_enabled" BOOLEAN NOT NULL DEFAULT false,
    "two_factor_method" "TwoFactorMethod",
    "totp_secret" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "kyc_documents" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "type" "KycDocumentType" NOT NULL,
    "storage_key" TEXT NOT NULL,
    "original_name" TEXT NOT NULL,
    "mime_type" TEXT NOT NULL,
    "size_bytes" INTEGER NOT NULL,
    "uploaded_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "kyc_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "two_factor_challenges" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "method" "TwoFactorMethod" NOT NULL,
    "code_hash" TEXT,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "consumed_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "two_factor_challenges_pkey" PRIMARY KEY ("id")
);

-- Indexes
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");
CREATE INDEX "users_kyc_status_idx" ON "users"("kyc_status");
CREATE INDEX "kyc_documents_user_id_type_idx" ON "kyc_documents"("user_id", "type");
CREATE INDEX "two_factor_challenges_user_id_created_at_idx" ON "two_factor_challenges"("user_id", "created_at");

-- Foreign Keys
ALTER TABLE "kyc_documents"
  ADD CONSTRAINT "kyc_documents_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "two_factor_challenges"
  ADD CONSTRAINT "two_factor_challenges_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
