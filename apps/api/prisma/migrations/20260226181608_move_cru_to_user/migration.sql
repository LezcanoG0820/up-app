/*
  Warnings:

  - You are about to drop the column `cru` on the `Ticket` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "public"."Ticket" DROP COLUMN "cru";

-- AlterTable
ALTER TABLE "public"."User" ADD COLUMN     "cru" TEXT;
