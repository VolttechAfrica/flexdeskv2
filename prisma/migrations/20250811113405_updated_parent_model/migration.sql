/*
  Warnings:

  - Added the required column `roleId` to the `Parent` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Parent" ADD COLUMN     "roleId" TEXT NOT NULL;

-- AddForeignKey
ALTER TABLE "Parent" ADD CONSTRAINT "Parent_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE CASCADE ON UPDATE CASCADE;
