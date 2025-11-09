-- CreateEnum
CREATE TYPE "PlatformName" AS ENUM ('Instagram', 'Facebook', 'YouTube', 'TikTok');

-- CreateTable
CREATE TABLE "social_service_request" (
    "id" TEXT NOT NULL,
    "serviceName" TEXT NOT NULL,
    "socialServiceId" TEXT NOT NULL,
    "platform" "PlatformName" NOT NULL,
    "artistName" TEXT NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "preferredDeliveryDate" TIMESTAMP(3) NOT NULL,
    "specialNotes" TEXT,
    "attachedFiles" TEXT[],
    "status" TEXT NOT NULL DEFAULT 'Pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "buyerId" TEXT NOT NULL,
    "artistID" TEXT NOT NULL,

    CONSTRAINT "social_service_request_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "social_service" (
    "id" TEXT NOT NULL,
    "serviceName" TEXT NOT NULL,
    "platform" "PlatformName" NOT NULL,
    "artistName" TEXT NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "preferredDeliveryDate" TIMESTAMP(3) NOT NULL,
    "specialNotes" TEXT,
    "attachedFiles" TEXT[],
    "status" TEXT NOT NULL DEFAULT 'Pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "artistID" TEXT NOT NULL,

    CONSTRAINT "social_service_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "social_service_request" ADD CONSTRAINT "social_service_request_buyerId_fkey" FOREIGN KEY ("buyerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "social_service_request" ADD CONSTRAINT "social_service_request_artistID_fkey" FOREIGN KEY ("artistID") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "social_service" ADD CONSTRAINT "social_service_artistID_fkey" FOREIGN KEY ("artistID") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
