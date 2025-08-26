/*
  Warnings:

  - The primary key for the `StaffQualification` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - A unique constraint covering the columns `[staffId,qualification,institution,course]` on the table `StaffQualification` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "StaffQualification_staffId_key";

-- AlterTable
ALTER TABLE "StaffProfile" ALTER COLUMN "address" SET DATA TYPE VARCHAR(200);

-- AlterTable
ALTER TABLE "StaffQualification" DROP CONSTRAINT "StaffQualification_pkey";

-- CreateIndex
CREATE UNIQUE INDEX "StaffQualification_staffId_qualification_institution_course_key" ON "StaffQualification"("staffId", "qualification", "institution", "course");
