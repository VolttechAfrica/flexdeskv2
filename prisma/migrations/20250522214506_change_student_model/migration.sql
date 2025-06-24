-- DropForeignKey
ALTER TABLE "Student" DROP CONSTRAINT "Student_classArmId_fkey";

-- AddForeignKey
ALTER TABLE "Student" ADD CONSTRAINT "Student_classArmId_fkey" FOREIGN KEY ("classArmId") REFERENCES "ClassArm"("id") ON DELETE SET NULL ON UPDATE CASCADE;
