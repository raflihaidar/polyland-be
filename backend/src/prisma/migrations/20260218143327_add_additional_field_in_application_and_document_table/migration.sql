/*
  Warnings:

  - You are about to drop the column `cid` on the `application_documents` table. All the data in the column will be lost.
  - You are about to drop the column `description` on the `application_documents` table. All the data in the column will be lost.
  - You are about to drop the column `address` on the `lands` table. All the data in the column will be lost.
  - Added the required column `fileName` to the `application_documents` table without a default value. This is not possible if the table is not empty.
  - Added the required column `fileSize` to the `application_documents` table without a default value. This is not possible if the table is not empty.
  - Added the required column `fileUrl` to the `application_documents` table without a default value. This is not possible if the table is not empty.
  - Added the required column `mimeType` to the `application_documents` table without a default value. This is not possible if the table is not empty.
  - Added the required column `type` to the `application_documents` table without a default value. This is not possible if the table is not empty.
  - Added the required column `province` to the `lands` table without a default value. This is not possible if the table is not empty.
  - Added the required column `regency` to the `lands` table without a default value. This is not possible if the table is not empty.
  - Added the required column `rt` to the `lands` table without a default value. This is not possible if the table is not empty.
  - Added the required column `rw` to the `lands` table without a default value. This is not possible if the table is not empty.
  - Added the required column `street_address` to the `lands` table without a default value. This is not possible if the table is not empty.
  - Added the required column `subdistrict` to the `lands` table without a default value. This is not possible if the table is not empty.
  - Added the required column `ward` to the `lands` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "DocumentType" AS ENUM ('FOTO_KTP_KK_PEMOHON', 'FOTO_KTP_KK_PENJUAL', 'SURAT_NIKAH', 'SK_59_KANWIL_BPN_DKI', 'AKTA_JUAL_BELI', 'AKTA_HIBAH', 'PBB_TAHUN_BERJALAN', 'SURAT_TUGAS_NOTARIS', 'FOTO_COPY_SSB', 'SURAT_KETERANGAN_WARIS', 'AKTA_PEMBAGIAN_HAK_BERSAMA', 'SURAT_KUASA');

-- DropForeignKey
ALTER TABLE "application_documents" DROP CONSTRAINT "application_documents_application_id_fkey";

-- AlterTable
ALTER TABLE "application_documents" DROP COLUMN "cid",
DROP COLUMN "description",
ADD COLUMN     "fileHash" VARCHAR(128),
ADD COLUMN     "fileName" VARCHAR(255) NOT NULL,
ADD COLUMN     "fileSize" INTEGER NOT NULL,
ADD COLUMN     "fileUrl" VARCHAR(255) NOT NULL,
ADD COLUMN     "mimeType" VARCHAR(100) NOT NULL,
ADD COLUMN     "type" "DocumentType" NOT NULL;

-- AlterTable
ALTER TABLE "lands" DROP COLUMN "address",
ADD COLUMN     "province" VARCHAR(100) NOT NULL,
ADD COLUMN     "regency" VARCHAR(100) NOT NULL,
ADD COLUMN     "rt" VARCHAR(50) NOT NULL,
ADD COLUMN     "rw" VARCHAR(50) NOT NULL,
ADD COLUMN     "street_address" TEXT NOT NULL,
ADD COLUMN     "subdistrict" VARCHAR(100) NOT NULL,
ADD COLUMN     "ward" VARCHAR(100) NOT NULL,
ALTER COLUMN "north_boundary" DROP NOT NULL,
ALTER COLUMN "south_boundary" DROP NOT NULL,
ALTER COLUMN "west_boundary" DROP NOT NULL,
ALTER COLUMN "east_boundary" DROP NOT NULL,
ALTER COLUMN "latitude" DROP NOT NULL,
ALTER COLUMN "longitude" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "application_documents" ADD CONSTRAINT "application_documents_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;
