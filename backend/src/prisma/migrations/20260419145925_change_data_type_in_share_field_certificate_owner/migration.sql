/*
  Warnings:

  - You are about to alter the column `ownership_pct` on the `certificate_owners` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(5,4)`.
  - Made the column `ownership_pct` on table `certificate_owners` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "certificate_owners" ALTER COLUMN "ownership_pct" SET NOT NULL,
ALTER COLUMN "ownership_pct" DROP DEFAULT,
ALTER COLUMN "ownership_pct" SET DATA TYPE DECIMAL(5,4);
