/*
  Warnings:

  - A unique constraint covering the columns `[application_id,person_id]` on the table `application_owners` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "application_owners_application_id_person_id_key" ON "application_owners"("application_id", "person_id");
