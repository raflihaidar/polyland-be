/*
  Warnings:

  - You are about to drop the `certificate_notes` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "certificate_notes" DROP CONSTRAINT "certificate_notes_certificate_id_fkey";

-- DropIndex
DROP INDEX "certificates_nib_key";

-- DropTable
DROP TABLE "certificate_notes";

-- CreateTable
CREATE TABLE "certificate_notes      " (
    "id" TEXT NOT NULL,
    "certificate_id" UUID NOT NULL,
    "note" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "certificate_notes      _pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "certificate_notes      " ADD CONSTRAINT "certificate_notes      _certificate_id_fkey" FOREIGN KEY ("certificate_id") REFERENCES "certificates"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
