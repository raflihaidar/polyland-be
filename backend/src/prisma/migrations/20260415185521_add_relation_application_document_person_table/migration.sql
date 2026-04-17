-- AlterTable
ALTER TABLE "application_documents" ADD COLUMN     "person_id" UUID;

-- AddForeignKey
ALTER TABLE "application_documents" ADD CONSTRAINT "application_documents_person_id_fkey" FOREIGN KEY ("person_id") REFERENCES "persons"("id") ON DELETE SET NULL ON UPDATE CASCADE;
