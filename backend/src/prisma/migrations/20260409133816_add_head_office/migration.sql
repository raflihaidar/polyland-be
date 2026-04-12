/*
  Warnings:

  - You are about to drop the column `head_office` on the `land_offices` table. All the data in the column will be lost.
  - You are about to drop the column `nip` on the `land_offices` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[head_office_id]` on the table `land_offices` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "land_offices" DROP COLUMN "head_office",
DROP COLUMN "nip",
ADD COLUMN     "head_office_id" UUID;

-- AlterTable
ALTER TABLE "persons" ADD COLUMN     "digitalSignature" TEXT,
ADD COLUMN     "nip" VARCHAR(20);

-- CreateIndex
CREATE UNIQUE INDEX "land_offices_head_office_id_key" ON "land_offices"("head_office_id");

-- AddForeignKey
ALTER TABLE "land_offices" ADD CONSTRAINT "land_offices_head_office_id_fkey" FOREIGN KEY ("head_office_id") REFERENCES "persons"("id") ON DELETE SET NULL ON UPDATE CASCADE;
