/*
  Warnings:

  - A unique constraint covering the columns `[application_id,person_id,type]` on the table `application_documents` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "application_documents_application_id_person_id_type_key" ON "application_documents"("application_id", "person_id", "type");
