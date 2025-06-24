-- CreateTable
CREATE TABLE "GraduatedStudent" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "year" VARCHAR(100),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GraduatedStudent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "GraduatedStudent_studentId_key" ON "GraduatedStudent"("studentId");

-- CreateIndex
CREATE INDEX "idx_graduated_student" ON "GraduatedStudent"("studentId");

-- AddForeignKey
ALTER TABLE "GraduatedStudent" ADD CONSTRAINT "GraduatedStudent_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;
