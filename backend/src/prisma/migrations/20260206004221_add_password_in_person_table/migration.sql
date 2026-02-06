/*
  Warnings:

  - Added the required column `password` to the `persons` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "persons" ADD COLUMN     "password" VARCHAR(100) NOT NULL;
