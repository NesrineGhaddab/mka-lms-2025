/*
  Warnings:

  - You are about to drop the column `fileUrl` on the `Course` table. All the data in the column will be lost.
  - You are about to drop the column `type` on the `Course` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Course" DROP COLUMN "fileUrl",
DROP COLUMN "type";
