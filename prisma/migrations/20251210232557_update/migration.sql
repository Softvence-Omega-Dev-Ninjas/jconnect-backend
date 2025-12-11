/*
  Warnings:

  - You are about to drop the column `platform` on the `social_service` table. All the data in the column will be lost.
  - You are about to drop the column `platform` on the `social_service_request` table. All the data in the column will be lost.
  - You are about to drop the column `facebook` on the `user_profiles` table. All the data in the column will be lost.
  - You are about to drop the column `instagram` on the `user_profiles` table. All the data in the column will be lost.
  - You are about to drop the column `tiktok` on the `user_profiles` table. All the data in the column will be lost.
  - You are about to drop the column `youtube` on the `user_profiles` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "user_profiles_user_id_key";

-- AlterTable
ALTER TABLE "social_service" DROP COLUMN "platform",
ADD COLUMN     "platforms" TEXT[];

-- AlterTable
ALTER TABLE "social_service_request" DROP COLUMN "platform",
ADD COLUMN     "platforms" TEXT[];

-- AlterTable
ALTER TABLE "user_profiles" DROP COLUMN "facebook",
DROP COLUMN "instagram",
DROP COLUMN "tiktok",
DROP COLUMN "youtube";

-- DropEnum
DROP TYPE "PlatformName";

-- CreateTable
CREATE TABLE "social_profiles" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "orderId" INTEGER NOT NULL,
    "platformName" TEXT NOT NULL,
    "platformLink" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "social_profiles_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "social_profiles" ADD CONSTRAINT "social_profiles_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "user_profiles"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;
