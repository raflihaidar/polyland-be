-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'SUCCESS', 'EXPIRED');

-- CreateEnum
CREATE TYPE "MintingStatus" AS ENUM ('PENDING', 'PROCESSING', 'SUCCESS', 'FAILED');

-- AlterTable
ALTER TABLE "certificates" ADD COLUMN     "minting_status" "MintingStatus" NOT NULL DEFAULT 'PENDING',
ADD COLUMN     "payment_status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
ADD COLUMN     "token_id" INTEGER,
ADD COLUMN     "tx_hash" VARCHAR(255);
