/*
  Warnings:

  - Added the required column `expireAt` to the `application_payments` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "application_payments" ADD COLUMN     "expireAt" TIMESTAMP(3) NOT NULL;
