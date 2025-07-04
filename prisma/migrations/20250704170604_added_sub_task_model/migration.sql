-- CreateTable
CREATE TABLE "SubTask" (
    "id" TEXT NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "status" "TaskStatus" NOT NULL DEFAULT 'PENDING',
    "taskId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "notes" VARCHAR(1000),
    "tagTo" VARCHAR(100),

    CONSTRAINT "SubTask_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "idx_subtask_name" ON "SubTask"("name");

-- CreateIndex
CREATE INDEX "idx_subtask_task" ON "SubTask"("taskId");

-- CreateIndex
CREATE INDEX "idx_subtask_status" ON "SubTask"("status");

-- AddForeignKey
ALTER TABLE "SubTask" ADD CONSTRAINT "SubTask_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;
