/*
  Warnings:

  - A unique constraint covering the columns `[nip]` on the table `persons` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "roles" ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- CreateIndex
CREATE UNIQUE INDEX "persons_nip_key" ON "persons"("nip");
