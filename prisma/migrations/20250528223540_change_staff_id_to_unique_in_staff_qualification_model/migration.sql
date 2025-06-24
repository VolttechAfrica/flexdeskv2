/*
  Warnings:

  - A unique constraint covering the columns `[staffId]` on the table `StaffQualification` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "StaffQualification_staffId_key" ON "StaffQualification"("staffId");
