/*
  Warnings:

  - You are about to drop the column `service` on the `PrivateMessage` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('Service', 'Payment', 'UserRegistration');

-- AlterTable
ALTER TABLE "PrivateMessage" DROP COLUMN "service",
ADD COLUMN     "serviceId" TEXT;

-- AlterTable
ALTER TABLE "UserNotification" ADD COLUMN     "type" "NotificationType";

-- AlterTable
ALTER TABLE "notification-toggle" ADD COLUMN     "Service" BOOLEAN NOT NULL DEFAULT true;

-- AddForeignKey
ALTER TABLE "PrivateMessage" ADD CONSTRAINT "PrivateMessage_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "services"("id") ON DELETE SET NULL ON UPDATE CASCADE;
