/*
  Warnings:

  - A unique constraint covering the columns `[order_id]` on the table `application_payments` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "application_payments_order_id_key" ON "application_payments"("order_id");
