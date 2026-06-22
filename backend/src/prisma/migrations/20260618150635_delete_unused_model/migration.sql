/*
  Warnings:

  - You are about to drop the `deeds` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `module_groups` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[cid]` on the table `certificates` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
ALTER TABLE "deeds" DROP CONSTRAINT "deeds_createdBy_fkey";

-- DropForeignKey
ALTER TABLE "deeds" DROP CONSTRAINT "deeds_person_id_fkey";

-- DropTable
DROP TABLE "deeds";

-- DropTable
DROP TABLE "module_groups";

-- CreateIndex
CREATE UNIQUE INDEX "certificates_cid_key" ON "certificates"("cid");
