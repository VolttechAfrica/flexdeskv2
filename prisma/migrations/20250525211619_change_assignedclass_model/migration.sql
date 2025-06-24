/*
  Warnings:

  - The primary key for the `AssignedClasses` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - A unique constraint covering the columns `[staffId,classId,classArmId]` on the table `AssignedClasses` will be added. If there are existing duplicate values, this will fail.
  - The required column `id` was added to the `AssignedClasses` table with a prisma-level default value. This is not possible if the table is not empty. Please add this column as optional, then populate it before making it required.

*/
-- AlterTable
ALTER TABLE "AssignedClasses" DROP CONSTRAINT "AssignedClasses_pkey",
ADD COLUMN     "id" TEXT NOT NULL,
ADD CONSTRAINT "AssignedClasses_pkey" PRIMARY KEY ("id");

-- CreateIndex
CREATE UNIQUE INDEX "AssignedClasses_staffId_classId_classArmId_key" ON "AssignedClasses"("staffId", "classId", "classArmId");
