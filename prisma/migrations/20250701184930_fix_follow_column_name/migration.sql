/*
  Warnings:

  - The primary key for the `follows` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `following_id` on the `follows` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[follower_id,followed_id]` on the table `follows` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `followed_id` to the `follows` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "follows" DROP CONSTRAINT "follows_following_id_fkey";

-- DropIndex
DROP INDEX "follows_follower_id_following_id_key";

-- AlterTable
ALTER TABLE "follows" DROP CONSTRAINT "follows_pkey",
DROP COLUMN "following_id",
ADD COLUMN     "followed_id" TEXT NOT NULL,
ADD CONSTRAINT "follows_pkey" PRIMARY KEY ("follower_id", "followed_id");

-- CreateIndex
CREATE UNIQUE INDEX "follows_follower_id_followed_id_key" ON "follows"("follower_id", "followed_id");

-- AddForeignKey
ALTER TABLE "follows" ADD CONSTRAINT "follows_followed_id_fkey" FOREIGN KEY ("followed_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
