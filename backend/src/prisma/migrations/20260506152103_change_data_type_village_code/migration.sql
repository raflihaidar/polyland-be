/*
  Warnings:

  - You are about to drop the column `land_office_id` on the `queues` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "lands" DROP CONSTRAINT "lands_village_code_fkey";

-- DropForeignKey
ALTER TABLE "queues" DROP CONSTRAINT "queues_land_office_id_fkey";

-- DropForeignKey
ALTER TABLE "queues" DROP CONSTRAINT "queues_loket_id_fkey";

-- AlterTable
ALTER TABLE "lands" ALTER COLUMN "village_code" SET DATA TYPE VARCHAR(255);

-- AlterTable
ALTER TABLE "queues" DROP COLUMN "land_office_id",
ALTER COLUMN "loket_id" SET DATA TYPE UUID
USING "loket_id"::uuid;

-- AlterTable
ALTER TABLE "villages" ALTER COLUMN "code" SET DATA TYPE VARCHAR(255);

-- AddForeignKey
ALTER TABLE "lands" ADD CONSTRAINT "lands_village_code_fkey" FOREIGN KEY ("village_code") REFERENCES "villages"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "queues" ADD CONSTRAINT "queues_loket_id_fkey" FOREIGN KEY ("loket_id") REFERENCES "lokets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
