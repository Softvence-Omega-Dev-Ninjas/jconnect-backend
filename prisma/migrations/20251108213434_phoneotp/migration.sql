-- AlterTable
ALTER TABLE "users" ADD COLUMN     "phoneOtp" INTEGER,
ADD COLUMN     "phoneOtpExpiresAt" TIMESTAMP(3),
ADD COLUMN     "phoneVerified" BOOLEAN NOT NULL DEFAULT false;
