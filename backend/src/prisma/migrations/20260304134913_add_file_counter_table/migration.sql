/*
  Warnings:

  - A unique constraint covering the columns `[file_number]` on the table `applications` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateTable
CREATE TABLE "FileCounter" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "value" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "FileCounter_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "applications_file_number_key" ON "applications"("file_number");
