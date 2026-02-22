/*
  Warnings:

  - The values [DIAJUKAN,PERBAIKAN_BERKAS] on the enum `ApplicationStatus` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "ApplicationStatus_new" AS ENUM ('DIPROSES', 'VERIFIKASI_BERKAS', 'PROSES_PENGUKURAN', 'PENANDATANGANAN', 'DITOLAK', 'SELESAI');
ALTER TABLE "public"."applications" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "applications" ALTER COLUMN "status" TYPE "ApplicationStatus_new" USING ("status"::text::"ApplicationStatus_new");
ALTER TYPE "ApplicationStatus" RENAME TO "ApplicationStatus_old";
ALTER TYPE "ApplicationStatus_new" RENAME TO "ApplicationStatus";
DROP TYPE "public"."ApplicationStatus_old";
ALTER TABLE "applications" ALTER COLUMN "status" SET DEFAULT 'DIPROSES';
COMMIT;

-- AlterTable
ALTER TABLE "applications" ALTER COLUMN "status" SET DEFAULT 'DIPROSES';
