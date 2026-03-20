/*
  Warnings:

  - A unique constraint covering the columns `[land_office_id]` on the table `land_office_prices` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "land_office_prices_land_office_id_key" ON "land_office_prices"("land_office_id");
