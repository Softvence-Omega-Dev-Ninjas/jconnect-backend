-- CreateEnum
CREATE TYPE "CustomServiceStatus" AS ENUM ('PENDING', 'QUOTED', 'ACCEPTED', 'REJECTED', 'COMPLETED');

-- CreateTable
CREATE TABLE "CustomServiceRequest" (
    "id" TEXT NOT NULL,
    "buyerId" TEXT NOT NULL,
    "targetCreatorId" TEXT,
    "serviceName" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "budgetRangeMin" DOUBLE PRECISION,
    "budgetRangeMax" DOUBLE PRECISION,
    "preferredDeliveryDate" TIMESTAMP(3),
    "uploadedFileUrl" TEXT,
    "status" "CustomServiceStatus" NOT NULL DEFAULT 'PENDING',
    "creatorQuotePrice" DOUBLE PRECISION,
    "creatorQuoteExpires" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CustomServiceRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CustomServiceRequest_buyerId_idx" ON "CustomServiceRequest"("buyerId");

-- CreateIndex
CREATE INDEX "CustomServiceRequest_targetCreatorId_idx" ON "CustomServiceRequest"("targetCreatorId");

-- AddForeignKey
ALTER TABLE "CustomServiceRequest" ADD CONSTRAINT "CustomServiceRequest_buyerId_fkey" FOREIGN KEY ("buyerId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomServiceRequest" ADD CONSTRAINT "CustomServiceRequest_targetCreatorId_fkey" FOREIGN KEY ("targetCreatorId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
