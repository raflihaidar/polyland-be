/*
  Warnings:

  - You are about to drop the column `group_id` on the `modules` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "modules" DROP CONSTRAINT "modules_group_id_fkey";

-- AlterTable
ALTER TABLE "modules" DROP COLUMN "group_id";
