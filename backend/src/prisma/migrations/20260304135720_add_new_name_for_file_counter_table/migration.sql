/*
  Warnings:

  - You are about to drop the `FileCounter` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropTable
DROP TABLE "FileCounter";

-- CreateTable
CREATE TABLE "file_counters" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "value" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "file_counters_pkey" PRIMARY KEY ("id")
);
