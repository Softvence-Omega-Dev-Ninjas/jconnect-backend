/*
  Warnings:

  - Added the required column `ballance` to the `withdrawals` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "withdrawals" ADD COLUMN     "ballance" INTEGER NOT NULL;
