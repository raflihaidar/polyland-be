/*
  Warnings:

  - You are about to drop the column `owner_id` on the `certificates` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "certificates" DROP CONSTRAINT "certificates_owner_id_fkey";

-- AlterTable
ALTER TABLE "certificates" DROP COLUMN "owner_id";

-- CreateTable
CREATE TABLE "certificate_owners" (
    "id" UUID NOT NULL,
    "certificate_id" UUID NOT NULL,
    "person_id" UUID NOT NULL,
    "ownership_pct" DOUBLE PRECISION DEFAULT 100,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "certificate_owners_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "certificate_owners_certificate_id_person_id_key" ON "certificate_owners"("certificate_id", "person_id");

-- AddForeignKey
ALTER TABLE "certificate_owners" ADD CONSTRAINT "certificate_owners_certificate_id_fkey" FOREIGN KEY ("certificate_id") REFERENCES "certificates"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "certificate_owners" ADD CONSTRAINT "certificate_owners_person_id_fkey" FOREIGN KEY ("person_id") REFERENCES "persons"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
