/*
  Warnings:

  - You are about to drop the column `notes` on the `account_verifications` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[person_id]` on the table `account_verifications` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "account_verifications" DROP COLUMN "notes";

-- CreateIndex
CREATE UNIQUE INDEX "account_verifications_person_id_key" ON "account_verifications"("person_id");
