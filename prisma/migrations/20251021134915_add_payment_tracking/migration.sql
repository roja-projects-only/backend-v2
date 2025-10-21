-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('UNPAID', 'PARTIAL', 'PAID', 'OVERDUE', 'COLLECTION');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('CASH');

-- CreateEnum
CREATE TYPE "PaymentType" AS ENUM ('CASH', 'CREDIT');

-- CreateEnum
CREATE TYPE "CollectionStatus" AS ENUM ('ACTIVE', 'OVERDUE', 'SUSPENDED');

-- AlterTable
ALTER TABLE "Customer" ADD COLUMN     "collectionStatus" "CollectionStatus" NOT NULL DEFAULT 'ACTIVE',
ADD COLUMN     "creditLimit" DOUBLE PRECISION DEFAULT 1000,
ADD COLUMN     "lastPaymentDate" TIMESTAMP(3),
ADD COLUMN     "outstandingBalance" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "Sale" ADD COLUMN     "paymentType" "PaymentType" NOT NULL DEFAULT 'CASH';

-- CreateTable
CREATE TABLE "Payment" (
    "id" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "status" "PaymentStatus" NOT NULL DEFAULT 'UNPAID',
    "paymentMethod" "PaymentMethod",
    "paidAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "paidAt" TIMESTAMP(3),
    "dueDate" TIMESTAMP(3),
    "notes" TEXT,
    "saleId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "recordedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReminderNote" (
    "id" TEXT NOT NULL,
    "note" TEXT NOT NULL,
    "reminderDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "customerId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReminderNote_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Payment_saleId_key" ON "Payment"("saleId");

-- CreateIndex
CREATE INDEX "Payment_customerId_idx" ON "Payment"("customerId");

-- CreateIndex
CREATE INDEX "Payment_status_idx" ON "Payment"("status");

-- CreateIndex
CREATE INDEX "Payment_dueDate_idx" ON "Payment"("dueDate");

-- CreateIndex
CREATE INDEX "ReminderNote_customerId_idx" ON "ReminderNote"("customerId");

-- CreateIndex
CREATE INDEX "ReminderNote_reminderDate_idx" ON "ReminderNote"("reminderDate");

-- CreateIndex
CREATE INDEX "Customer_collectionStatus_idx" ON "Customer"("collectionStatus");

-- CreateIndex
CREATE INDEX "Customer_outstandingBalance_idx" ON "Customer"("outstandingBalance");

-- CreateIndex
CREATE INDEX "Sale_paymentType_idx" ON "Sale"("paymentType");

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "Sale"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_recordedById_fkey" FOREIGN KEY ("recordedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReminderNote" ADD CONSTRAINT "ReminderNote_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReminderNote" ADD CONSTRAINT "ReminderNote_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
