-- CreateTable
CREATE TABLE "AssignedSubject" (
    "id" TEXT NOT NULL,
    "staffId" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AssignedSubject_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "idx_assigned_subject_staff" ON "AssignedSubject"("staffId");

-- CreateIndex
CREATE INDEX "idx_assigned_subject_subject" ON "AssignedSubject"("subjectId");

-- CreateIndex
CREATE INDEX "idx_subject_class" ON "Subject"("classId");

-- CreateIndex
CREATE INDEX "idx_subject_class_arm" ON "Subject"("classArmId");

-- AddForeignKey
ALTER TABLE "AssignedSubject" ADD CONSTRAINT "AssignedSubject_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "Staff"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssignedSubject" ADD CONSTRAINT "AssignedSubject_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE CASCADE ON UPDATE CASCADE;
