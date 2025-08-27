/*
  Warnings:

  - The `status` column on the `Parent` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - A unique constraint covering the columns `[studentId]` on the table `Login` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "ParentStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'BLOCKED', 'PENDING');

-- AlterTable
ALTER TABLE "Login" ADD COLUMN     "studentId" TEXT;

-- AlterTable
ALTER TABLE "Parent" DROP COLUMN "status",
ADD COLUMN     "status" "ParentStatus" NOT NULL DEFAULT 'PENDING';

-- CreateIndex
CREATE UNIQUE INDEX "Login_studentId_key" ON "Login"("studentId");

-- CreateIndex
CREATE INDEX "idx_login_student" ON "Login"("studentId");

-- CreateIndex
CREATE INDEX "idx_parent_status" ON "Parent"("status");

-- CreateIndex
CREATE INDEX "idx_student_parent" ON "Student"("parentId");

-- AddForeignKey
ALTER TABLE "Login" ADD CONSTRAINT "fk_login_student" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;
