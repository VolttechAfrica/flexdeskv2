-- DropForeignKey
ALTER TABLE "Student" DROP CONSTRAINT "Student_classArmId_fkey";

-- AlterTable
ALTER TABLE "Student" ALTER COLUMN "classArmId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "Student" ADD CONSTRAINT "Student_classArmId_fkey" FOREIGN KEY ("classArmId") REFERENCES "ClassArm"("id") ON DELETE SET NULL ON UPDATE CASCADE;
