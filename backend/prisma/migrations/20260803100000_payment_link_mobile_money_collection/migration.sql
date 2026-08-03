-- AlterTable
ALTER TABLE "payment_links" ADD COLUMN "mobile_money_collection_id" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "payment_links_mobile_money_collection_id_key" ON "payment_links"("mobile_money_collection_id");

-- AddForeignKey
ALTER TABLE "payment_links"
  ADD CONSTRAINT "payment_links_mobile_money_collection_id_fkey"
  FOREIGN KEY ("mobile_money_collection_id") REFERENCES "mobile_money_collections"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
