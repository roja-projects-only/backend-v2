/*
  Warnings:

  - You are about to drop the `ReminderNote` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "public"."ReminderNote" DROP CONSTRAINT "ReminderNote_createdById_fkey";

-- DropForeignKey
ALTER TABLE "public"."ReminderNote" DROP CONSTRAINT "ReminderNote_customerId_fkey";

-- DropTable
DROP TABLE "public"."ReminderNote";
