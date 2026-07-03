/*
  Warnings:

  - You are about to drop the column `order_id` on the `applications` table. All the data in the column will be lost.
  - You are about to drop the column `paidAt` on the `applications` table. All the data in the column will be lost.
  - You are about to drop the column `paymentSattus` on the `applications` table. All the data in the column will be lost.
  - You are about to drop the column `total_fee` on the `applications` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "applications" DROP COLUMN "order_id",
DROP COLUMN "paidAt",
DROP COLUMN "paymentSattus",
DROP COLUMN "total_fee";

-- CreateTable
CREATE TABLE "application_payments" (
    "id" SERIAL NOT NULL,
    "application_id" UUID NOT NULL,
    "order_id" VARCHAR(150) NOT NULL,
    "qr_url" TEXT NOT NULL,
    "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "amount" BIGINT NOT NULL DEFAULT 0,
    "paidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "application_payments_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "application_payments" ADD CONSTRAINT "application_payments_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "applications"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
