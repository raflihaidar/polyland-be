/*
  Warnings:

  - You are about to drop the `certificate_notes      ` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[cert_code]` on the table `applications` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
ALTER TABLE "certificate_notes      " DROP CONSTRAINT "certificate_notes      _certificate_id_fkey";

-- AlterTable
ALTER TABLE "applications" ADD COLUMN     "cert_code" VARCHAR(100);

-- DropTable
DROP TABLE "certificate_notes      ";

-- CreateTable
CREATE TABLE "certificate_notes" (
    "id" TEXT NOT NULL,
    "certificate_id" UUID NOT NULL,
    "note" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "certificate_notes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "applications_cert_code_key" ON "applications"("cert_code");

-- AddForeignKey
ALTER TABLE "certificate_notes" ADD CONSTRAINT "certificate_notes_certificate_id_fkey" FOREIGN KEY ("certificate_id") REFERENCES "certificates"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
