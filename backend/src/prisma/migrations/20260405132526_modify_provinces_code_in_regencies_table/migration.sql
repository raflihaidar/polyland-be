/*
  Warnings:

  - You are about to drop the column `number` on the `certificates` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[nib]` on the table `certificates` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[code]` on the table `certificates` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `code` to the `certificates` table without a default value. This is not possible if the table is not empty.
  - Added the required column `nib` to the `certificates` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "certificates_number_key";

-- AlterTable
ALTER TABLE "certificates" DROP COLUMN "number",
ADD COLUMN     "code" VARCHAR(100) NOT NULL,
ADD COLUMN     "hash" VARCHAR(255),
ADD COLUMN     "nib" VARCHAR(100) NOT NULL,
ALTER COLUMN "cid" DROP NOT NULL;

-- AlterTable
ALTER TABLE "land_offices" ADD COLUMN     "head_office" VARCHAR(255),
ADD COLUMN     "nip" VARCHAR(20);

-- AlterTable
ALTER TABLE "lands" ADD COLUMN     "province_code" INTEGER NOT NULL DEFAULT 35,
ADD COLUMN     "regency_code" INTEGER NOT NULL DEFAULT 3578;

-- CreateTable
CREATE TABLE "provinces" (
    "id" SERIAL NOT NULL,
    "code" INTEGER NOT NULL,
    "name" VARCHAR(50) NOT NULL,

    CONSTRAINT "provinces_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "regencies" (
    "id" SERIAL NOT NULL,
    "code" INTEGER NOT NULL,
    "province_code" INTEGER NOT NULL,
    "name" VARCHAR(50) NOT NULL,

    CONSTRAINT "regencies_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "provinces_code_key" ON "provinces"("code");

-- CreateIndex
CREATE UNIQUE INDEX "regencies_code_key" ON "regencies"("code");

-- CreateIndex
CREATE UNIQUE INDEX "certificates_nib_key" ON "certificates"("nib");

-- CreateIndex
CREATE UNIQUE INDEX "certificates_code_key" ON "certificates"("code");

-- AddForeignKey
ALTER TABLE "lands" ADD CONSTRAINT "lands_province_code_fkey" FOREIGN KEY ("province_code") REFERENCES "provinces"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lands" ADD CONSTRAINT "lands_regency_code_fkey" FOREIGN KEY ("regency_code") REFERENCES "regencies"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "regencies" ADD CONSTRAINT "regencies_province_code_fkey" FOREIGN KEY ("province_code") REFERENCES "provinces"("code") ON DELETE RESTRICT ON UPDATE CASCADE;
