/*
  Warnings:

  - You are about to drop the column `payment_tx_hash` on the `applications` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "applications" DROP COLUMN "payment_tx_hash",
ADD COLUMN     "order_id" VARCHAR(150),
ADD COLUMN     "paymentSattus" "PaymentStatus" NOT NULL DEFAULT 'PENDING';
