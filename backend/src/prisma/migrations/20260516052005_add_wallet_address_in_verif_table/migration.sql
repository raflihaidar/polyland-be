/*
  Warnings:

  - A unique constraint covering the columns `[wallet_address]` on the table `account_verifications` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "account_verifications" ADD COLUMN     "wallet_address" VARCHAR(50);

-- CreateIndex
CREATE UNIQUE INDEX "account_verifications_wallet_address_key" ON "account_verifications"("wallet_address");
