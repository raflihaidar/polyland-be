/*
  Warnings:

  - You are about to drop the column `digitalSignature` on the `persons` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "persons" DROP COLUMN "digitalSignature",
ADD COLUMN     "privateKey" TEXT,
ADD COLUMN     "publicKey" TEXT;
