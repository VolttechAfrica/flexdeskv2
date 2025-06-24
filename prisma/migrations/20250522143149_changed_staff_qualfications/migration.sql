/*
  Warnings:

  - The primary key for the `StaffQualification` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `id` on the `StaffQualification` table. All the data in the column will be lost.
  - Made the column `qualification` on table `StaffQualification` required. This step will fail if there are existing NULL values in that column.
  - Made the column `institution` on table `StaffQualification` required. This step will fail if there are existing NULL values in that column.
  - Made the column `course` on table `StaffQualification` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "StaffQualification" DROP CONSTRAINT "StaffQualification_pkey",
DROP COLUMN "id",
ALTER COLUMN "qualification" SET NOT NULL,
ALTER COLUMN "institution" SET NOT NULL,
ALTER COLUMN "course" SET NOT NULL,
ADD CONSTRAINT "StaffQualification_pkey" PRIMARY KEY ("staffId", "qualification", "institution", "course");
