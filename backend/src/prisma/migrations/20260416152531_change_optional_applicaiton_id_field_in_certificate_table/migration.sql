-- DropForeignKey
ALTER TABLE "certificates" DROP CONSTRAINT "certificates_application_id_fkey";

-- AlterTable
ALTER TABLE "certificates" ALTER COLUMN "application_id" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "certificates" ADD CONSTRAINT "certificates_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "applications"("id") ON DELETE SET NULL ON UPDATE CASCADE;
