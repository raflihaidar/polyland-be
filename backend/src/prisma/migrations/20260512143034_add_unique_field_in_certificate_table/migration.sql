/*
  Warnings:

  - A unique constraint covering the columns `[nib]` on the table `certificates` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[cid]` on the table `certificates` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "certificates_nib_key" ON "certificates"("nib");

-- CreateIndex
CREATE UNIQUE INDEX "certificates_cid_key" ON "certificates"("cid");
