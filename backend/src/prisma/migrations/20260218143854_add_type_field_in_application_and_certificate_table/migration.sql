/*
  Warnings:

  - Changed the type of `type` on the `applications` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Added the required column `type` to the `certificates` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "CertificateType" AS ENUM ('SHM', 'SHGB', 'SHGU');

-- AlterTable
ALTER TABLE "applications" DROP COLUMN "type",
ADD COLUMN     "type" "CertificateType" NOT NULL;

-- AlterTable
ALTER TABLE "certificates" ADD COLUMN     "type" "CertificateType" NOT NULL;

-- AlterTable
ALTER TABLE "lands" ALTER COLUMN "area_size" DROP NOT NULL;
