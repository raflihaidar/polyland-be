/*
  Warnings:

  - A unique constraint covering the columns `[token_id]` on the table `certificates` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "certificates_token_id_key" ON "certificates"("token_id");
