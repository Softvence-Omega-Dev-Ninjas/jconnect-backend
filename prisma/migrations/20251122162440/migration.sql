/*
  Warnings:

  - You are about to drop the column `platformFeeAmount` on the `ServiceRequest` table. All the data in the column will be lost.
  - You are about to drop the column `platformFeeRate` on the `ServiceRequest` table. All the data in the column will be lost.
  - You are about to drop the column `servicePrice` on the `ServiceRequest` table. All the data in the column will be lost.
  - You are about to drop the column `status` on the `ServiceRequest` table. All the data in the column will be lost.
  - You are about to drop the column `totalAmount` on the `ServiceRequest` table. All the data in the column will be lost.
  - The `uploadedFileUrl` column on the `ServiceRequest` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- AlterTable
ALTER TABLE "ServiceRequest" DROP COLUMN "platformFeeAmount",
DROP COLUMN "platformFeeRate",
DROP COLUMN "servicePrice",
DROP COLUMN "status",
DROP COLUMN "totalAmount",
DROP COLUMN "uploadedFileUrl",
ADD COLUMN     "uploadedFileUrl" TEXT[];
