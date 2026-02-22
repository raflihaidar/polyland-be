/*
  Warnings:

  - You are about to alter the column `nik` on the `persons` table. The data in that column could be lost. The data in that column will be cast from `VarChar(150)` to `VarChar(20)`.
  - You are about to alter the column `phone` on the `persons` table. The data in that column could be lost. The data in that column will be cast from `VarChar(100)` to `VarChar(20)`.

*/
-- CreateEnum
CREATE TYPE "VerificationStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('LAKI_LAKI', 'PEREMPUAN');

-- AlterTable
ALTER TABLE "persons" ADD COLUMN     "birthDate" TIMESTAMP(3),
ADD COLUMN     "birthPlace" VARCHAR(100),
ADD COLUMN     "gender" "Gender",
ADD COLUMN     "isVerified" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "verifiedAt" TIMESTAMP(3),
ALTER COLUMN "nik" SET DATA TYPE VARCHAR(20),
ALTER COLUMN "phone" SET DATA TYPE VARCHAR(20),
ALTER COLUMN "updatedAt" DROP DEFAULT;

-- CreateTable
CREATE TABLE "account_verifications" (
    "id" UUID NOT NULL,
    "person_id" UUID NOT NULL,
    "fullName" VARCHAR(150) NOT NULL,
    "nik" VARCHAR(20) NOT NULL,
    "phone" VARCHAR(20) NOT NULL,
    "birthPlace" VARCHAR(100) NOT NULL,
    "birthDate" TIMESTAMP(3) NOT NULL,
    "gender" "Gender" NOT NULL,
    "address" TEXT NOT NULL,
    "status" "VerificationStatus" NOT NULL DEFAULT 'PENDING',
    "rejectionReason" TEXT,
    "verifiedBy" UUID,
    "verifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "account_verifications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "account_verifications_status_idx" ON "account_verifications"("status");

-- AddForeignKey
ALTER TABLE "account_verifications" ADD CONSTRAINT "account_verifications_person_id_fkey" FOREIGN KEY ("person_id") REFERENCES "persons"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "account_verifications" ADD CONSTRAINT "account_verifications_verifiedBy_fkey" FOREIGN KEY ("verifiedBy") REFERENCES "persons"("id") ON DELETE SET NULL ON UPDATE CASCADE;
