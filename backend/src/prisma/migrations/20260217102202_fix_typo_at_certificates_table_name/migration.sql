/*
  Warnings:

  - You are about to drop the `cerfiticates` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "cerfiticates" DROP CONSTRAINT "cerfiticates_land_id_fkey";

-- DropForeignKey
ALTER TABLE "cerfiticates" DROP CONSTRAINT "cerfiticates_owner_id_fkey";

-- DropTable
DROP TABLE "cerfiticates";

-- CreateTable
CREATE TABLE "certificates" (
    "id" UUID NOT NULL,
    "number" VARCHAR(100) NOT NULL,
    "land_id" UUID NOT NULL,
    "owner_id" UUID NOT NULL,
    "cid" VARCHAR(255) NOT NULL,
    "status" "CertificateStatus",
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "certificates_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "certificates_number_key" ON "certificates"("number");

-- AddForeignKey
ALTER TABLE "certificates" ADD CONSTRAINT "certificates_land_id_fkey" FOREIGN KEY ("land_id") REFERENCES "lands"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "certificates" ADD CONSTRAINT "certificates_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "persons"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
