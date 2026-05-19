/*
  Warnings:

  - You are about to drop the column `queueId` on the `applications` table. All the data in the column will be lost.
  - Added the required column `person_id` to the `queues` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "applications" DROP CONSTRAINT "applications_queueId_fkey";

-- AlterTable
ALTER TABLE "applications" DROP COLUMN "queueId";

-- AlterTable
ALTER TABLE "queues" ADD COLUMN     "person_id" UUID NOT NULL;

-- AddForeignKey
ALTER TABLE "queues" ADD CONSTRAINT "queues_person_id_fkey" FOREIGN KEY ("person_id") REFERENCES "persons"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
