/*
  Warnings:

  - Made the column `cert_code` on table `applications` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "applications" ALTER COLUMN "cert_code" SET NOT NULL;
