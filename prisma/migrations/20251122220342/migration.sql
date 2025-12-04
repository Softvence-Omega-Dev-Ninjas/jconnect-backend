-- DropForeignKey
ALTER TABLE "ServiceRequest" DROP CONSTRAINT "ServiceRequest_serviceId_fkey";

-- AlterTable
ALTER TABLE "ServiceRequest" ALTER COLUMN "serviceId" DROP NOT NULL,
ALTER COLUMN "uploadedFileUrl" SET DEFAULT ARRAY[]::TEXT[];

-- AddForeignKey
ALTER TABLE "ServiceRequest" ADD CONSTRAINT "ServiceRequest_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "services"("id") ON DELETE SET NULL ON UPDATE CASCADE;
