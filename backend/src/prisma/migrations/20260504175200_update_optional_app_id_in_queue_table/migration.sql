-- DropForeignKey
ALTER TABLE "queues" DROP CONSTRAINT "queues_application_id_fkey";

-- AlterTable
ALTER TABLE "queues" ALTER COLUMN "application_id" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "queues" ADD CONSTRAINT "queues_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "applications"("id") ON DELETE SET NULL ON UPDATE CASCADE;
