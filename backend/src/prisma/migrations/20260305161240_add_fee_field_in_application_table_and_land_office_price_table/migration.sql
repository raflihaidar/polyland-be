/*
  Warnings:

  - Added the required column `land_price_per_m2` to the `applications` table without a default value. This is not possible if the table is not empty.
  - Added the required column `registration_fee` to the `applications` table without a default value. This is not possible if the table is not empty.

*/
-- AlterEnum
ALTER TYPE "DocumentType" ADD VALUE 'SSB';

-- AlterTable
ALTER TABLE "applications" ADD COLUMN     "land_price_per_m2" INTEGER NOT NULL,
ADD COLUMN     "registration_fee" INTEGER NOT NULL,
ADD COLUMN     "total_fee" BIGINT NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "land_office_prices" (
    "id" UUID NOT NULL,
    "land_office_id" UUID NOT NULL,
    "price_per_m2" INTEGER NOT NULL,
    "registration_fee" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "land_office_prices_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "land_office_prices" ADD CONSTRAINT "land_office_prices_land_office_id_fkey" FOREIGN KEY ("land_office_id") REFERENCES "land_offices"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
