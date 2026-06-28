/*
  Warnings:

  - The `area_size` column on the `lands` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- AlterTable
ALTER TABLE "lands" DROP COLUMN "area_size",
ADD COLUMN     "area_size" INTEGER;
