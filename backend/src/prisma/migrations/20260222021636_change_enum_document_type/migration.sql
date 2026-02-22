/*
  Warnings:

  - The values [FOTO_KTP_KK_PEMOHON,FOTO_KTP_KK_PENJUAL,SURAT_NIKAH,SK_59_KANWIL_BPN_DKI,AKTA_HIBAH,PBB_TAHUN_BERJALAN,SURAT_TUGAS_NOTARIS,FOTO_COPY_SSB,SURAT_KETERANGAN_WARIS,AKTA_PEMBAGIAN_HAK_BERSAMA,SURAT_KUASA] on the enum `DocumentType` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "DocumentType_new" AS ENUM ('KTP_PEMBELI', 'KTP_PENJUAL', 'KK_PEMBELI', 'AKTA_JUAL_BELI', 'PBB', 'SPPT', 'SERTIFIKAT_TANAH');
ALTER TABLE "application_documents" ALTER COLUMN "type" TYPE "DocumentType_new" USING ("type"::text::"DocumentType_new");
ALTER TYPE "DocumentType" RENAME TO "DocumentType_old";
ALTER TYPE "DocumentType_new" RENAME TO "DocumentType";
DROP TYPE "public"."DocumentType_old";
COMMIT;
