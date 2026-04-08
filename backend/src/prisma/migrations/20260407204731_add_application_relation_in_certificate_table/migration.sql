/*
  Warnings:

  - A unique constraint covering the columns `[application_id]` on the table `certificates` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `application_id` to the `certificates` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "certificates" ADD COLUMN     "application_id" UUID NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "certificates_application_id_key" ON "certificates"("application_id");

-- AddForeignKey
ALTER TABLE "certificates" ADD CONSTRAINT "certificates_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "applications"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
