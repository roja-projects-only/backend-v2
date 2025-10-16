/*
  Warnings:

  - A unique constraint covering the columns `[customerId,date]` on the table `Sale` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "Sale_customerId_date_key" ON "Sale"("customerId", "date" ASC);
