-- CreateEnum
CREATE TYPE "TaskStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'ON_HOLD');

-- CreateEnum
CREATE TYPE "TaskPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT');

-- CreateEnum
CREATE TYPE "TaskMemberRole" AS ENUM ('ASSIGNEE', 'REVIEWER', 'OBSERVER');

-- CreateEnum
CREATE TYPE "TaskMemberStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED');

-- CreateTable
CREATE TABLE "Task" (
    "id" TEXT NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "description" VARCHAR(500),
    "status" "TaskStatus" NOT NULL DEFAULT 'PENDING',
    "priority" "TaskPriority" NOT NULL DEFAULT 'MEDIUM',
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "termId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),
    "notes" VARCHAR(1000),

    CONSTRAINT "Task_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TaskMember" (
    "id" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "role" "TaskMemberRole" NOT NULL DEFAULT 'ASSIGNEE',
    "status" "TaskMemberStatus" NOT NULL DEFAULT 'PENDING',
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "leftAt" TIMESTAMP(3),

    CONSTRAINT "TaskMember_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "idx_task_name" ON "Task"("name");

-- CreateIndex
CREATE INDEX "idx_task_start_date" ON "Task"("startDate");

-- CreateIndex
CREATE INDEX "idx_task_creator" ON "Task"("createdBy");

-- CreateIndex
CREATE INDEX "idx_task_school" ON "Task"("schoolId");

-- CreateIndex
CREATE INDEX "idx_task_term" ON "Task"("termId");

-- CreateIndex
CREATE INDEX "idx_task_status" ON "Task"("status");

-- CreateIndex
CREATE INDEX "idx_task_priority" ON "Task"("priority");

-- CreateIndex
CREATE INDEX "idx_task_member_task" ON "TaskMember"("taskId");

-- CreateIndex
CREATE INDEX "idx_task_member_staff" ON "TaskMember"("memberId");

-- CreateIndex
CREATE INDEX "idx_task_member_role" ON "TaskMember"("role");

-- CreateIndex
CREATE INDEX "idx_task_member_status" ON "TaskMember"("status");

-- CreateIndex
CREATE INDEX "idx_staff_role" ON "Staff"("roleId");

-- CreateIndex
CREATE INDEX "idx_staff_school" ON "Staff"("schoolId");

-- CreateIndex
CREATE INDEX "idx_staff_email" ON "Staff"("email");

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_termId_fkey" FOREIGN KEY ("termId") REFERENCES "Term"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "Staff"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskMember" ADD CONSTRAINT "TaskMember_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskMember" ADD CONSTRAINT "TaskMember_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Staff"("id") ON DELETE CASCADE ON UPDATE CASCADE;
