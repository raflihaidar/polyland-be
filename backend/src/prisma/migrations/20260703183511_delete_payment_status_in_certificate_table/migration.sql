/*
  Warnings:

  - The values [PENERBITAN_SERTIFIKAT] on the enum `ApplicationStatus` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `payment_status` on the `certificates` table. All the data in the column will be lost.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "ApplicationStatus_new" AS ENUM ('VERIFIKASI_BERKAS', 'MENUNGGU_PEMBAYARAN', 'VERIFIKASI_PEMBAYARAN', 'PROSES_PENERBITAN', 'DITOLAK', 'SELESAI', 'TERJADI_KESALAHAN', 'PEMBAYARAN_DIBATALKAN', 'PEMBAYARAN_KADALUARSA', 'PEMBAYARAN_DIKEMBALIKAN');
ALTER TABLE "public"."applications" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "applications" ALTER COLUMN "status" TYPE "ApplicationStatus_new" USING ("status"::text::"ApplicationStatus_new");
ALTER TYPE "ApplicationStatus" RENAME TO "ApplicationStatus_old";
ALTER TYPE "ApplicationStatus_new" RENAME TO "ApplicationStatus";
DROP TYPE "public"."ApplicationStatus_old";
ALTER TABLE "applications" ALTER COLUMN "status" SET DEFAULT 'VERIFIKASI_BERKAS';
COMMIT;

-- AlterTable
ALTER TABLE "certificates" DROP COLUMN "payment_status";
