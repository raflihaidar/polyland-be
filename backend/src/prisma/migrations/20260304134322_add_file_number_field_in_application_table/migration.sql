/*
  Warnings:

  - Added the required column `file_number` to the `applications` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "applications" ADD COLUMN     "file_number" VARCHAR(100) NOT NULL;
