/*
  Warnings:

  - Added the required column `land_office_id` to the `applications` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "applications" ADD COLUMN     "land_office_id" UUID NOT NULL,
ADD COLUMN     "officer_id" UUID,
ADD COLUMN     "personId" UUID;

-- AlterTable
ALTER TABLE "persons" ADD COLUMN     "land_office_id" UUID;

-- CreateTable
CREATE TABLE "land_offices" (
    "id" UUID NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "code" VARCHAR(50) NOT NULL,
    "address" TEXT,
    "province" VARCHAR(100) NOT NULL,
    "regency" VARCHAR(100) NOT NULL,
    "phone" VARCHAR(20),
    "email" VARCHAR(150),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "land_offices_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "land_offices_code_key" ON "land_offices"("code");

-- AddForeignKey
ALTER TABLE "persons" ADD CONSTRAINT "persons_land_office_id_fkey" FOREIGN KEY ("land_office_id") REFERENCES "land_offices"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "applications" ADD CONSTRAINT "applications_land_office_id_fkey" FOREIGN KEY ("land_office_id") REFERENCES "land_offices"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "applications" ADD CONSTRAINT "applications_officer_id_fkey" FOREIGN KEY ("officer_id") REFERENCES "persons"("id") ON DELETE SET NULL ON UPDATE CASCADE;
