/*
  Warnings:

  - You are about to drop the column `application_id` on the `queues` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "queues" DROP CONSTRAINT "queues_application_id_fkey";

-- DropIndex
DROP INDEX "queues_application_id_key";

-- AlterTable
ALTER TABLE "applications" ADD COLUMN     "queueId" UUID;

-- AlterTable
ALTER TABLE "queues" DROP COLUMN "application_id";

-- AddForeignKey
ALTER TABLE "applications" ADD CONSTRAINT "applications_queueId_fkey" FOREIGN KEY ("queueId") REFERENCES "queues"("id") ON DELETE SET NULL ON UPDATE CASCADE;
