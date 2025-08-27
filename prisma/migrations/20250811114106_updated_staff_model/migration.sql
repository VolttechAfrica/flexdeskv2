-- CreateEnum
CREATE TYPE "StaffType" AS ENUM ('ADMIN', 'CLASS_ROOM_TEACHER', 'SUBJECT_TEACHER', 'OTHER');

-- AlterTable
ALTER TABLE "Staff" ADD COLUMN     "type" "StaffType" NOT NULL DEFAULT 'OTHER';

-- CreateIndex
CREATE INDEX "idx_staff_type" ON "Staff"("type");
