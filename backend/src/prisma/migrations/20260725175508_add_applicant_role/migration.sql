/*
  Warnings:

  - The values [KTP_PEMBELI,KTP_PENJUAL,KK_PEMBELI] on the enum `DocumentType` will be removed. If these variants are still used in the database, this will fail.

*/
-- CreateEnum
CREATE TYPE "ApplicantRole" AS ENUM ('BUYER', 'SELLER');

-- AlterEnum
BEGIN;
CREATE TYPE "DocumentType_new" AS ENUM ('KTP', 'KARTU_KELUARGA', 'NPWP', 'SURAT_NIKAH', 'SPPT_PBB', 'PPH', 'BPHTB', 'AKTA_JUAL_BELI');
ALTER TABLE "application_documents" ALTER COLUMN "type" TYPE "DocumentType_new" USING ("type"::text::"DocumentType_new");
ALTER TYPE "DocumentType" RENAME TO "DocumentType_old";
ALTER TYPE "DocumentType_new" RENAME TO "DocumentType";
DROP TYPE "public"."DocumentType_old";
COMMIT;

-- AlterTable
ALTER TABLE "application_documents" ADD COLUMN     "role" "ApplicantRole";
