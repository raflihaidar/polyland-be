/*
  Warnings:

  - You are about to drop the column `application_id` on the `certificates` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "certificates_application_id_key";

-- AlterTable
ALTER TABLE "certificates" DROP COLUMN "application_id";
