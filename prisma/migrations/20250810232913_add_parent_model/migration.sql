-- AlterTable
ALTER TABLE "Student" ADD COLUMN     "parentId" TEXT;

-- CreateTable
CREATE TABLE "Parent" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "firstName" VARCHAR(100) NOT NULL,
    "lastName" VARCHAR(100) NOT NULL,
    "otherName" VARCHAR(100),
    "phone" VARCHAR(20) NOT NULL,
    "address" VARCHAR(200),
    "state" VARCHAR(100),
    "lga" VARCHAR(100),
    "city" VARCHAR(100),
    "status" VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Parent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ParentLogin" (
    "id" TEXT NOT NULL,
    "parentId" TEXT NOT NULL,
    "password" VARCHAR(150) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ParentLogin_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SchoolRegistrationRequest" (
    "id" TEXT NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "type" VARCHAR(100) NOT NULL,
    "educationLevel" VARCHAR(100) NOT NULL,
    "numberOfStudents" VARCHAR(100) NOT NULL,
    "numberOfStaff" VARCHAR(100) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SchoolRegistrationRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Address" (
    "id" TEXT NOT NULL,
    "city" VARCHAR(100) NOT NULL,
    "state" VARCHAR(100) NOT NULL,
    "country" VARCHAR(100) NOT NULL,
    "zipCode" VARCHAR(100) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Address_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContactInfo" (
    "id" TEXT NOT NULL,
    "schoolRegistrationRequestId" TEXT NOT NULL,
    "firstName" VARCHAR(150) NOT NULL,
    "lastName" VARCHAR(150) NOT NULL,
    "email" VARCHAR(100) NOT NULL,
    "phone" VARCHAR(100) NOT NULL,
    "jobTitle" VARCHAR(100) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContactInfo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdditionalInfo" (
    "id" TEXT NOT NULL,
    "currentSoftware" VARCHAR(100) NOT NULL,
    "implementationTimeline" VARCHAR(100) NOT NULL,
    "specificRequirements" VARCHAR(1000) NOT NULL,
    "howDidYouHearAboutUs" VARCHAR(100) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AdditionalInfo_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Parent_email_key" ON "Parent"("email");

-- CreateIndex
CREATE INDEX "idx_parent_email" ON "Parent"("email");

-- CreateIndex
CREATE INDEX "idx_parent_status" ON "Parent"("status");

-- CreateIndex
CREATE UNIQUE INDEX "ParentLogin_parentId_key" ON "ParentLogin"("parentId");

-- CreateIndex
CREATE INDEX "idx_parent_login" ON "ParentLogin"("parentId");

-- CreateIndex
CREATE INDEX "idx_school_reg_name" ON "SchoolRegistrationRequest"("name");

-- CreateIndex
CREATE INDEX "idx_school_reg_type" ON "SchoolRegistrationRequest"("type");

-- CreateIndex
CREATE INDEX "idx_school_reg_edu_level" ON "SchoolRegistrationRequest"("educationLevel");

-- CreateIndex
CREATE INDEX "idx_school_reg_students" ON "SchoolRegistrationRequest"("numberOfStudents");

-- CreateIndex
CREATE INDEX "idx_school_reg_staff" ON "SchoolRegistrationRequest"("numberOfStaff");

-- CreateIndex
CREATE INDEX "idx_address_city" ON "Address"("city");

-- CreateIndex
CREATE INDEX "idx_address_state" ON "Address"("state");

-- CreateIndex
CREATE INDEX "idx_address_country" ON "Address"("country");

-- CreateIndex
CREATE INDEX "idx_address_zip" ON "Address"("zipCode");

-- CreateIndex
CREATE INDEX "idx_contact_school_reg" ON "ContactInfo"("schoolRegistrationRequestId");

-- CreateIndex
CREATE INDEX "idx_add_info_software" ON "AdditionalInfo"("currentSoftware");

-- CreateIndex
CREATE INDEX "idx_add_info_timeline" ON "AdditionalInfo"("implementationTimeline");

-- CreateIndex
CREATE INDEX "idx_add_info_requirements" ON "AdditionalInfo"("specificRequirements");

-- CreateIndex
CREATE INDEX "idx_add_info_source" ON "AdditionalInfo"("howDidYouHearAboutUs");

-- AddForeignKey
ALTER TABLE "Student" ADD CONSTRAINT "Student_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Parent"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ParentLogin" ADD CONSTRAINT "ParentLogin_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Parent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Address" ADD CONSTRAINT "Address_id_fkey" FOREIGN KEY ("id") REFERENCES "SchoolRegistrationRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContactInfo" ADD CONSTRAINT "ContactInfo_schoolRegistrationRequestId_fkey" FOREIGN KEY ("schoolRegistrationRequestId") REFERENCES "SchoolRegistrationRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdditionalInfo" ADD CONSTRAINT "AdditionalInfo_id_fkey" FOREIGN KEY ("id") REFERENCES "SchoolRegistrationRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;
