import fs from "fs";
import csv from "csv-parser";
import { PrismaClient, SchoolStatus, StaffStatus, StudentStatus, SubjectStatus } from "@prisma/client";

import path from "path";
import { fileURLToPath } from "url";


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const prisma = new PrismaClient();

function mapSchoolStatus(status: string): SchoolStatus {
  const normalized = status.trim().toLowerCase();
  if (normalized === "inactive" || normalized === "suspended") return SchoolStatus.INACTIVE;
  return SchoolStatus.ACTIVE;
}

function mapStaffStatus(status: string): StaffStatus {
  const normalized = status.trim().toLowerCase();
  if (normalized === "inactive" || normalized === "suspended") return StaffStatus.INACTIVE;
  return StaffStatus.ACTIVE;
}

function mapStatus(status: string): StudentStatus {
  const normalized = status.trim().toLowerCase();
  if (normalized === "inactive") {
    return StudentStatus.INACTIVE;
  } else if (normalized === "active") {
    return StudentStatus.ACTIVE;
  } else if (normalized === "suspended") {
    return StudentStatus.EXPELLED;
  } else {
    return StudentStatus.GRADUATED
  }
}


function mapSubjectStatus(status: string): SubjectStatus {
  if (status?.toUpperCase() === "INACTIVE") return "INACTIVE";
  return "ACTIVE";
}


function readCSV(filePath: string): Promise<any[]> {
  const records: any[] = [];

  return new Promise((resolve, reject) => {
    fs.createReadStream(filePath)
      .pipe(csv())
      .on("data", (row) => records.push(row))
      .on("end", () => resolve(records))
      .on("error", reject);
  });
}


async function importSchools() {
  const records: any[] = [];
  const csvFilePath = path.join(__dirname, "db/schools.csv");

  return new Promise<void>((resolve, reject) => {
    fs.createReadStream(csvFilePath)
      .pipe(csv())
      .on("data", (row) => records.push(row))
      .on("end", async () => {
        for (const school of records) {
          try {
            await prisma.school.create({
              data: {
                id: school.schoolid,
                name: school.school_name,
                shortName: school.school_initial,
                email: school.school_official_email,
                phone: school.school_official_telephone || null,
                address: school.school_address || null,
                slogan: school.school_motto || null,
                logo: school.school_logo || null,
                state: school.school_state || null,
                lga: school.school_lga || null,
                status: mapSchoolStatus(school.school_status),
                createdAt: new Date(school.school_registration_date),
              },
            });
            console.log(`✅ Imported school: ${school.school_name}`);
          } catch (error) {
            console.error(`❌ Failed to import school: ${school.school_name}`, error);
          }
        }
        resolve();
      })
      .on("error", reject);
  });
}

async function importRoles() {
  const records: any[] = [];
  const csvFilePath = path.join(__dirname, "db/role.csv");

  return new Promise<void>((resolve, reject) => {
    fs.createReadStream(csvFilePath)
      .pipe(csv())
      .on("data", (row) => records.push(row))
      .on("end", async () => {
        for (const role of records) {
          try {
            // You'll need to determine schoolId; if not in CSV, provide it manually
            const schoolId = "BPA661398"; // ← adjust here

            await prisma.role.create({
              data: {
                id: role.role_id,
                schoolId,
                name: role.role,
              },
            });

            console.log(`✅ Imported role: ${role.role}`);
          } catch (error) {
            console.error(`❌ Failed to import role: ${role.role}`, error);
          }
        }

        resolve();
      })
      .on("error", reject);
  });
}


async function importStaff() {
  const records: any[] = [];
  const csvFilePath = path.join(__dirname, "db/staff.csv");

  return new Promise<void>((resolve, reject) => {
    fs.createReadStream(csvFilePath)
      .pipe(csv())
      .on("data", (row) => records.push(row))
      .on("end", async () => {
        for (const staff of records) {
          try {
            // Get default role (you can change this logic as needed)
            const role = await prisma.role.findFirst({
              where: {
                id: staff.role.trim(),
                schoolId: staff.schoolid,
              },
            });

            if (!role) {
              console.warn(`⚠️ Skipping staff: ${staff.firstname} ${staff.surname} — role not found.`);
              continue;
            }

            await prisma.staff.create({
              data: {
                id: staff.staffid,
                schoolId: staff.schoolid,
                roleId: staff.role,
                email: staff.email,
                firstName: staff.firstname,
                lastName: staff.surname,
                otherName: staff.othername || null,
                status: mapStaffStatus(staff.status),
              },
            });

            console.log(`✅ Imported staff: ${staff.firstname} ${staff.surname}`);
          } catch (error) {
            console.error(`❌ Failed to import staff: ${staff.firstname} ${staff.surname}`, error);
          }
        }

        resolve();
      })
      .on("error", reject);
  });
}

async function importStaffQualifications() {
  const records: any[] = [];
  const csvFilePath = path.join(__dirname, "db/staffqualification.csv");

  return new Promise<void>((resolve, reject) => {
    fs.createReadStream(csvFilePath)
      .pipe(csv())
      .on("data", (row) => records.push(row))
      .on("end", async () => {
        for (const q of records) {
          try {
            await prisma.staffQualification.create({
              data: {
                staffId: q.staffid,
                qualification: q.quanlification || null,
                institution: q.institution || null,
                course: q.course || null,
                grade: q.grade || null,
                yearObtained: q.year_graduated || null,
              },
            });

            console.log(`✅ Imported qualification for staff: ${q.staffid}`);
          } catch (error) {
            console.error(`❌ Failed to import qualification for ${q.staffid}:`, error);
          }
        }

        resolve();
      })
      .on("error", reject);
  });
}


async function importStaffLogins() {
  const records: any[] = [];
  const csvFilePath = path.join(__dirname, "db/login_keys.csv");

  return new Promise<void>((resolve, reject) => {
    fs.createReadStream(csvFilePath)
      .pipe(csv())
      .on("data", (row) => records.push(row))
      .on("end", async () => {
        for (const login of records) {
          try {
            await prisma.login.create({
              data: {
                staffId: login.userid,
                password: login.login_key,
              },
            });

            console.log(`✅ Imported login for staff ID: ${login.userid}`);
          } catch (error) {
            console.error(`❌ Failed to import login for ${login.userid}:`, error);
          }
        }

        resolve();
      })
      .on("error", reject);
  });
}

async function importTerms() {
  const records: any[] = [];
  const csvFilePath = path.join(__dirname, "db/terms.csv");

  return new Promise<void>((resolve, reject) => {
    fs.createReadStream(csvFilePath)
      .pipe(csv())
      .on("data", (row) => records.push(row))
      .on("end", async () => {
        for (const term of records) {
          try {
            await prisma.term.create({
              data: {
                id: term.sessionid,
                schoolId: term.schoolid,
                name: term.sessionname,
                term: parseInt(term.level, 10),
                year: term.sessionyear,
                startDate: term.startdate,
                endDate: term.enddate
              },
            });

            console.log(`✅ Imported term: ${term.sessionname}`);
          } catch (error) {
            console.error(`❌ Failed to import term ${term.sessionname}:`, error);
          }
        }

        resolve();
      })
      .on("error", reject);
  });
}


async function importClasses() {
  const records: any[] = [];
  const csvFilePath = path.join(__dirname, "db/classes.csv");

  return new Promise<void>((resolve, reject) => {
    fs.createReadStream(csvFilePath)
      .pipe(csv())
      .on("data", (row) => records.push(row))
      .on("end", async () => {
        for (const row of records) {
          try {
            await prisma.schoolClass.create({
              data: {
                id: row.classid,
                name: row.classname,
                schoolId: row.schoolid,
                level: parseInt(row.gradelevel, 10),
              },
            }
            );

            console.log(`✅ Imported class: ${row.classname}`);
          } catch (error) {
            console.error(`❌ Failed to import class ${row.classname}:`, error);
          }
        }

        resolve();
      })
      .on("error", reject);
  });
}

async function getAllClassArms() {
  const classArms = await prisma.classArm.findMany();
  return classArms;
}

async function importClassArms() {
  const records: any[] = [];
  const csvFilePath = path.join(__dirname, "db/classarm.csv");

  const classArms = await getAllClassArms();


  return new Promise<void>((resolve, reject) => {
    fs.createReadStream(csvFilePath)
      .pipe(csv())
      .on("data", (row) => records.push(row))
      .on("end", async () => {
        for (const row of records) {
          try {

            const existingClassArm = classArms.find((arm) => arm.id === row.classarmid);
            if (existingClassArm) {
              console.log(`⚠️ Class arm with ID ${row.classarmid} already exists. Skipping.`);
              continue;
            } else {
              if(row.classid == '') {
                console.log(`⚠️ Class arm with ID ${row.classarmid} has no class. Skipping.`);
                continue;
              }else{
                await prisma.classArm.create({
                data: {
                  id: row.classarmid,
                  name: row.classarmname,
                  classId: row.classid,
                },
              });

              console.log(`✅ Imported class arm: ${row.classarmname}`);
              }
            }

          } catch (error) {
            console.error(`❌ Failed to import class arm ${row.classarmname}:`, error);
          }
        }

        resolve();
      })
      .on("error", reject);
  });
}



async function importStudents() {
  const rows = await readCSV(path.join(__dirname, "db/student.csv"));
  const termId = "9983876672";

  const [existingStudents, existingClassArms] = await Promise.all([
    prisma.student.findMany({ select: { id: true } }),
    prisma.classArm.findMany({ select: { id: true } }),
  ]);

  const existingStudentIds = new Set(existingStudents.map((s) => s.id));
  const existingClassArmIds = new Set(existingClassArms.map((c) => c.id));

  const studentData = rows
    .filter((row) => {
      if (existingStudentIds.has(row.studentid)) {
        console.log(`⚠️ Student with ID ${row.studentid} already exists. Skipping.`);
        return false;
      }

      if (!row.classidno || row.classidno === "none") {
        console.log(`⚠️ Student with ID ${row.studentid} has no class. Skipping.`);
        return false;
      }

      return true;
    })
    .map((row) => ({
      id: row.studentid,
      firstName: row.firstname,
      lastName: row.surname,
      otherName: row.othername || null,
      classId: row.classidno,
      classArmId: existingClassArmIds.has(row.classarmid) ? row.classarmid : null,
      roleId: row.role,
      termId,
      schoolId: row.schoolid,
      status: mapStatus(row.status),
    }));

  try {
    await prisma.student.createMany({
      data: studentData,
      skipDuplicates: true,
    });

    console.log(`✅ Imported ${studentData.length} students`);

    const graduated = rows
      .filter((row) => row.classidno === "graduated" && !existingStudentIds.has(row.studentid))
      .map((row) => ({ studentId: row.studentid }));

    if (graduated.length > 0) {
      await prisma.graduatedStudent.createMany({
        data: graduated,
        skipDuplicates: true,
      });

      console.log(`🎓 Imported ${graduated.length} graduated students`);
    }
  } catch (err) {
    console.error("❌ Failed to import students:", err);
  }
}

async function createDummyClass() {
  const schoolId = "BPA661398";

  const existingClass = await prisma.schoolClass.findUnique({
    where: {
      id: "graduated",
    },
  });

  if (existingClass) {
    console.log("Dummy class already exists. Skipping creation.");
    return;
  }
  await prisma.schoolClass.create({
    data: {
      id: "graduated",
      level: 17,
      name: "Graduated",
      schoolId: schoolId,
    },
  });
  console.log("Dummy class created successfully.");
}

async function getAllAssignedClasses() {
  const assignedClasses = await prisma.assignedClasses.findMany();
  return assignedClasses;
}

async function importAssignedClasses() {
  const records: any[] = [];
  const csvFilePath = path.join(__dirname, "db/assigned_classes.csv");
  const assignedClasses = await getAllAssignedClasses();

  return new Promise<void>((resolve, reject) => {
    fs.createReadStream(csvFilePath)
      .pipe(csv())
      .on("data", (row) => records.push(row))
      .on("end", async () => {
        for (const row of records) {
          try {
            const existingAssignedClass = assignedClasses.find((assignedClass) => assignedClass.staffId === row.staffid && assignedClass.classArmId === row.classarmid);

            if (existingAssignedClass) {
              console.log(`⚠️ Assigned class for staff ID ${row.staffid} already exists. Skipping.`);
              continue;
            }else{
              await prisma.assignedClasses.create({
              data: {
                staffId: row.userid,
                classId: row.classid,
                classArmId: row.classarm || null,
              },
            });
            console.log(`✅ Imported assigned class for staff ID: ${row.userid}`);
            }
          } catch (error) {
            console.error(`❌ Failed to import assigned class for ${row.userid}:`, error);
          }
        }

        resolve();
      })
      .on("error", reject);
  });
}

async function importSubjects() {
  const csvFilePath = path.join(__dirname, "db/subject.csv");
  const records: any[] = [];

  const [existingSubjects, existingClasses] = await Promise.all([
    prisma.subject.findMany({ select: { id: true } }),
    prisma.schoolClass.findMany({ select: { id: true } }),
  ]);

  const existingSubjectIds = new Set(existingSubjects.map((s) => s.id));
  const validClassIds = new Set(existingClasses.map((cls) => cls.id));

  return new Promise<void>((resolve, reject) => {
    fs.createReadStream(csvFilePath)
      .pipe(csv())
      .on("data", (row) => records.push(row))
      .on("end", async () => {
        const data = records
          .filter((row) => {
            if (existingSubjectIds.has(row.subjectid)) {
              console.log(`⚠️ Subject with ID ${row.subjectid} already exists. Skipping.`);
              return false;
            }

            if (!row.subjectid || !row.subjectname || !row.classid) {
              console.log(`⚠️ Missing required fields for subject:`, row);
              return false;
            }

            if (!validClassIds.has(row.classid)) {
              console.log(`⚠️ Skipping subject with invalid classId: ${row.classid}`);
              return false;
            }

            return true;
          })
          .map((row) => ({
            id: row.subjectid,
            name: row.subjectname,
            code: row.subjectid,
            classId: row.classid,
            classArmId: row.classarmid || null,
            status: mapSubjectStatus(row.status),
          }));

        try {
          await prisma.subject.createMany({
            data,
            skipDuplicates: true,
          });

          console.log(`✅ Successfully imported ${data.length} subjects.`);
          resolve();
        } catch (error) {
          console.error("❌ Failed to bulk import subjects:", error);
          reject(error);
        }
      })
      .on("error", reject);
  });
}



async function main() {
  try {
    await importSchools();
    await importRoles();
    await importStaff();
    await importStaffQualifications();
    await importStaffLogins();
    await importTerms();
    await importClasses();
    await createDummyClass();
    await importClassArms();
    await importStudents();
    await importAssignedClasses();
    await importSubjects();
  } catch (error) {
    console.error("Migration failed:", error);
  } finally {
    await prisma.$disconnect();
  }
}

//npx tsx scripts/migration.ts
main();
