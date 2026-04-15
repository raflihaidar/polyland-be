/*
  Warnings:

  - A unique constraint covering the columns `[nib]` on the table `applications` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `nib` to the `applications` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "applications" ADD COLUMN     "nib" VARCHAR(100) NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "applications_nib_key" ON "applications"("nib");
