/*
  Warnings:

  - You are about to drop the column `east_boundary` on the `lands` table. All the data in the column will be lost.
  - You are about to drop the column `latitude` on the `lands` table. All the data in the column will be lost.
  - You are about to drop the column `longitude` on the `lands` table. All the data in the column will be lost.
  - You are about to drop the column `north_boundary` on the `lands` table. All the data in the column will be lost.
  - You are about to drop the column `province` on the `lands` table. All the data in the column will be lost.
  - You are about to drop the column `regency` on the `lands` table. All the data in the column will be lost.
  - You are about to drop the column `south_boundary` on the `lands` table. All the data in the column will be lost.
  - You are about to drop the column `subdistrict` on the `lands` table. All the data in the column will be lost.
  - You are about to drop the column `ward` on the `lands` table. All the data in the column will be lost.
  - You are about to drop the column `west_boundary` on the `lands` table. All the data in the column will be lost.
  - Added the required column `district_code` to the `lands` table without a default value. This is not possible if the table is not empty.
  - Added the required column `village_code` to the `lands` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "lands" DROP COLUMN "east_boundary",
DROP COLUMN "latitude",
DROP COLUMN "longitude",
DROP COLUMN "north_boundary",
DROP COLUMN "province",
DROP COLUMN "regency",
DROP COLUMN "south_boundary",
DROP COLUMN "subdistrict",
DROP COLUMN "ward",
DROP COLUMN "west_boundary",
ADD COLUMN     "district_code" INTEGER NOT NULL,
ADD COLUMN     "village_code" INTEGER NOT NULL,
ALTER COLUMN "province_code" DROP DEFAULT,
ALTER COLUMN "regency_code" DROP DEFAULT;

-- CreateTable
CREATE TABLE "districts" (
    "id" SERIAL NOT NULL,
    "code" INTEGER NOT NULL,
    "regency_code" INTEGER NOT NULL,
    "name" VARCHAR(50) NOT NULL,

    CONSTRAINT "districts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "villages" (
    "id" SERIAL NOT NULL,
    "code" INTEGER NOT NULL,
    "district_code" INTEGER NOT NULL,
    "name" VARCHAR(50) NOT NULL,

    CONSTRAINT "villages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "districts_code_key" ON "districts"("code");

-- CreateIndex
CREATE UNIQUE INDEX "villages_code_key" ON "villages"("code");

-- AddForeignKey
ALTER TABLE "lands" ADD CONSTRAINT "lands_district_code_fkey" FOREIGN KEY ("district_code") REFERENCES "districts"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lands" ADD CONSTRAINT "lands_village_code_fkey" FOREIGN KEY ("village_code") REFERENCES "villages"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "districts" ADD CONSTRAINT "districts_regency_code_fkey" FOREIGN KEY ("regency_code") REFERENCES "regencies"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "villages" ADD CONSTRAINT "villages_district_code_fkey" FOREIGN KEY ("district_code") REFERENCES "districts"("code") ON DELETE RESTRICT ON UPDATE CASCADE;
