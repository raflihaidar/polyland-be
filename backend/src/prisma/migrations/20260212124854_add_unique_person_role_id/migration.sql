/*
  Warnings:

  - A unique constraint covering the columns `[person_id,role_id]` on the table `role_persons` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "role_persons_person_id_role_id_key" ON "role_persons"("person_id", "role_id");
