/*
  Warnings:

  - You are about to drop the column `facebook_username` on the `user_profiles` table. All the data in the column will be lost.
  - You are about to drop the column `instagram_username` on the `user_profiles` table. All the data in the column will be lost.
  - You are about to drop the column `tiktok_username` on the `user_profiles` table. All the data in the column will be lost.
  - You are about to drop the column `youtube_channel_url` on the `user_profiles` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "user_profiles" DROP COLUMN "facebook_username",
DROP COLUMN "instagram_username",
DROP COLUMN "tiktok_username",
DROP COLUMN "youtube_channel_url",
ADD COLUMN     "facebook" TEXT,
ADD COLUMN     "instagram" TEXT,
ADD COLUMN     "tiktok" TEXT,
ADD COLUMN     "youtube" TEXT;
