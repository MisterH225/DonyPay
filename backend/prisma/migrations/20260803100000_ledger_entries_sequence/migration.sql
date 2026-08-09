-- AlterTable
ALTER TABLE "ledger_entries" ADD COLUMN     "sequence" SERIAL NOT NULL;

-- CreateIndex
CREATE INDEX "ledger_entries_account_id_sequence_idx" ON "ledger_entries"("account_id", "sequence");
