-- CreateTable: PaymentTransaction
CREATE TABLE "PaymentTransaction" (
    "id" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "paymentMethod" "PaymentMethod" NOT NULL DEFAULT 'CASH',
    "notes" TEXT,
    "paymentId" TEXT NOT NULL,
    "recordedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PaymentTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PaymentTransaction_paymentId_idx" ON "PaymentTransaction"("paymentId");

-- CreateIndex
CREATE INDEX "PaymentTransaction_createdAt_idx" ON "PaymentTransaction"("createdAt");

-- AddForeignKey
ALTER TABLE "PaymentTransaction" ADD CONSTRAINT "PaymentTransaction_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentTransaction" ADD CONSTRAINT "PaymentTransaction_recordedById_fkey" FOREIGN KEY ("recordedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Migrate existing payment data to PaymentTransaction
-- For payments that have been paid (paidAt is not null), create a transaction record
INSERT INTO "PaymentTransaction" ("id", "amount", "paymentMethod", "notes", "paymentId", "recordedById", "createdAt")
SELECT 
    gen_random_uuid()::text,
    "paidAmount",
    COALESCE("paymentMethod", 'CASH'),
    'Migrated from legacy payment record',
    "id",
    "recordedById",
    COALESCE("paidAt", "updatedAt")
FROM "Payment"
WHERE "paidAmount" > 0 AND "paidAt" IS NOT NULL;

-- AlterTable: Remove old columns from Payment
ALTER TABLE "Payment" DROP COLUMN "paidAt";
ALTER TABLE "Payment" DROP COLUMN "paymentMethod";
