/*
  Warnings:

  - The primary key for the `FirstTimeLogin` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `userId` on the `FirstTimeLogin` table. All the data in the column will be lost.
  - You are about to drop the `ParentLogin` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `StaffLogin` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[staffId]` on the table `FirstTimeLogin` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[parentId]` on the table `FirstTimeLogin` will be added. If there are existing duplicate values, this will fail.
  - The required column `id` was added to the `FirstTimeLogin` table with a prisma-level default value. This is not possible if the table is not empty. Please add this column as optional, then populate it before making it required.

*/
-- DropForeignKey
ALTER TABLE "FirstTimeLogin" DROP CONSTRAINT "FirstTimeLogin_userId_fkey";

-- DropForeignKey
ALTER TABLE "ParentLogin" DROP CONSTRAINT "ParentLogin_parentId_fkey";

-- DropForeignKey
ALTER TABLE "StaffLogin" DROP CONSTRAINT "StaffLogin_staffId_fkey";

-- DropIndex
DROP INDEX "FirstTimeLogin_userId_key";

-- DropIndex
DROP INDEX "idx_first_time_login";

-- AlterTable
ALTER TABLE "FirstTimeLogin" DROP CONSTRAINT "FirstTimeLogin_pkey",
DROP COLUMN "userId",
ADD COLUMN     "id" TEXT NOT NULL,
ADD COLUMN     "parentId" TEXT,
ADD COLUMN     "staffId" TEXT,
ADD CONSTRAINT "FirstTimeLogin_pkey" PRIMARY KEY ("id");

-- DropTable
DROP TABLE "ParentLogin";

-- DropTable
DROP TABLE "StaffLogin";

-- CreateTable
CREATE TABLE "Login" (
    "id" TEXT NOT NULL,
    "staffId" TEXT,
    "parentId" TEXT,
    "password" VARCHAR(150) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Login_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Login_staffId_key" ON "Login"("staffId");

-- CreateIndex
CREATE UNIQUE INDEX "Login_parentId_key" ON "Login"("parentId");

-- CreateIndex
CREATE INDEX "idx_login_staff" ON "Login"("staffId");

-- CreateIndex
CREATE INDEX "idx_login_parent" ON "Login"("parentId");

-- CreateIndex
CREATE UNIQUE INDEX "FirstTimeLogin_staffId_key" ON "FirstTimeLogin"("staffId");

-- CreateIndex
CREATE UNIQUE INDEX "FirstTimeLogin_parentId_key" ON "FirstTimeLogin"("parentId");

-- CreateIndex
CREATE INDEX "idx_first_time_login_staff" ON "FirstTimeLogin"("staffId");

-- CreateIndex
CREATE INDEX "idx_first_time_login_parent" ON "FirstTimeLogin"("parentId");

-- AddForeignKey
ALTER TABLE "Login" ADD CONSTRAINT "fk_login_staff" FOREIGN KEY ("staffId") REFERENCES "Staff"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Login" ADD CONSTRAINT "fk_login_parent" FOREIGN KEY ("parentId") REFERENCES "Parent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FirstTimeLogin" ADD CONSTRAINT "fk_ftl_staff" FOREIGN KEY ("staffId") REFERENCES "Staff"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FirstTimeLogin" ADD CONSTRAINT "fk_ftl_parent" FOREIGN KEY ("parentId") REFERENCES "Parent"("id") ON DELETE CASCADE ON UPDATE CASCADE;
